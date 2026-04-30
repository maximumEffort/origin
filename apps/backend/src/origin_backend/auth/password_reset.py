"""
Admin password-reset flow (#83).

Flow:
  1. POST /auth/admin/forgot-password {email}
     - Always returns 200 to prevent email enumeration.
     - If email exists, generate a 32-byte token, bcrypt-hash it, persist with
       30-minute TTL, send via SendGrid.
     - Rate limit: 3/hour/email (caller enforces).
  2. POST /auth/admin/reset-password {token, newPassword}
     - Look up un-used, un-expired token by hash.
     - Validate password complexity.
     - Update AdminUser.password (bcrypt), mark token used.
     - Audit log.
     - Rate limit: 5/min/IP (caller enforces).

Security properties:
  - Token is single-use (usedAt set at consumption).
  - Token TTL is short (30 min).
  - Token is hashed at rest (bcrypt).
  - Forgot-password endpoint never reveals whether the email exists.
  - Reset endpoint enforces password complexity.
  - Both endpoints write to AuditLog when an admin is touched.
"""

from __future__ import annotations

import logging
import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from passlib.hash import bcrypt

from origin_backend.common.audit import log_action
from origin_backend.config import settings
from origin_backend.integrations import sendgrid_email
from prisma import Prisma

logger = logging.getLogger(__name__)

TOKEN_TTL_MINUTES = 30
MIN_PASSWORD_LENGTH = 12


def _generate_token() -> str:
    """32 bytes -> 43-char URL-safe string. Used as the secret in the email link."""
    return secrets.token_urlsafe(32)


def _validate_password_complexity(password: str) -> None:
    """Enforce a sensible-but-not-painful password policy for admins."""
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters",
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain an uppercase letter",
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain a lowercase letter",
        )
    if not re.search(r"[0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain a digit",
        )
    if not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must contain a symbol",
        )


async def request_reset(
    db: Prisma,
    *,
    email: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict[str, str]:
    """
    Issue a password reset token for an admin if the email exists.

    Always returns the same response shape regardless of whether the email
    matched an admin. This prevents account enumeration via timing or
    response differences.
    """
    generic_response = {
        "message": "If that email is registered, a reset link has been sent."
    }

    admin = await db.adminuser.find_unique(where={"email": email})
    if admin is None or not admin.isActive:
        # Still hash a dummy value so the wall-clock cost doesn't reveal the answer.
        bcrypt.hash(_generate_token())
        return generic_response

    token = _generate_token()
    token_hash = bcrypt.hash(token)
    expires_at = datetime.now(UTC) + timedelta(minutes=TOKEN_TTL_MINUTES)

    await db.passwordresettoken.create(
        data={
            "adminUserId": admin.id,
            "tokenHash": token_hash,
            "expiresAt": expires_at,
            "ipAddress": ip_address,
        }
    )

    reset_url = f"{settings.admin_base_url.rstrip('/')}/reset-password?token={token}"
    try:
        await sendgrid_email.send_admin_password_reset(
            admin.email,
            {
                "adminName": admin.fullName,
                "resetUrl": reset_url,
                "ttlMinutes": str(TOKEN_TTL_MINUTES),
            },
        )
    except Exception as e:
        # Don't leak the failure to the client; log it for ops.
        logger.exception("Failed to send password reset email: %s", e)

    await log_action(
        db,
        user_id=admin.id,
        action="PASSWORD_RESET_REQUESTED",
        entity_type="ADMIN_USER",
        entity_id=admin.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return generic_response


async def consume_reset(
    db: Prisma,
    *,
    token: str,
    new_password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict[str, str]:
    """
    Validate a reset token and set a new password.

    Tokens are single-use: once consumed (usedAt set), they cannot be reused.
    """
    _validate_password_complexity(new_password)

    # We can't query by tokenHash directly because bcrypt hashes are
    # non-deterministic. Pull every un-used, un-expired token and verify
    # against each. At admin scale this is O(active_tokens) which is tiny.
    candidates: list[Any] = await db.passwordresettoken.find_many(
        where={
            "usedAt": None,
            "expiresAt": {"gt": datetime.now(UTC)},
        },
    )

    matched = next((c for c in candidates if bcrypt.verify(token, c.tokenHash)), None)

    if matched is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link is invalid or has expired. Please request a new one.",
        )

    new_hash = bcrypt.hash(new_password)
    await db.adminuser.update(
        where={"id": matched.adminUserId},
        data={"password": new_hash},
    )
    await db.passwordresettoken.update(
        where={"id": matched.id},
        data={"usedAt": datetime.now(UTC)},
    )

    await log_action(
        db,
        user_id=matched.adminUserId,
        action="PASSWORD_RESET_COMPLETED",
        entity_type="ADMIN_USER",
        entity_id=matched.adminUserId,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return {"message": "Password updated successfully. Please log in."}
