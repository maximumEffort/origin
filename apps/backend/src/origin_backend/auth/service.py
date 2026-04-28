"""
Auth business logic.

Functions here are the Python equivalent of NestJS AuthService methods.
They take dependencies as arguments (rather than via DI decorators) so
they're trivially testable.

Strategy:
- OTP send: use Twilio Verify in production. In dev (Twilio unset),
  hash a generated code and store in OtpCode table.
- OTP verify: use Twilio Verify in production. In dev, look up the
  hash and compare.
- On successful verify: find_or_create the Customer, issue JWT pair.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from passlib.hash import bcrypt

from origin_backend.auth.jwt import issue_pair, verify_refresh_token
from origin_backend.config import settings
from origin_backend.integrations import twilio_verify
from prisma import Prisma

logger = logging.getLogger(__name__)


# â”€â”€ OTP helpers (dev mode only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


def _hash_otp(otp: str) -> str:
    """SHA-256 hash so plaintext is never stored."""
    return hashlib.sha256(otp.encode()).hexdigest()


def _generate_otp(length: int = 6) -> str:
    """Cryptographically random numeric OTP."""
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


# â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


async def send_otp(db: Prisma, phone: str) -> dict[str, object]:
    """
    Send an OTP to the given phone. Production uses Twilio Verify; dev mode
    uses a local DB record. In production we never log the code; in dev we
    log it once for the developer to read.
    """
    if settings.twilio_configured:
        await twilio_verify.send_otp(phone)
        return {"message": "OTP sent successfully", "expires_in": 300}

    if settings.is_production:
        # Production with no Twilio is a misconfiguration â€” refuse explicitly.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS service is not configured. Please contact support.",
        )

    # Dev fallback â€” generate locally
    otp = _generate_otp()
    expires_at = datetime.now(UTC) + timedelta(minutes=5)

    # Wipe any prior OTPs for this phone to avoid races
    await db.otpcode.delete_many(where={"phone": phone})
    await db.otpcode.create(
        data={
            "phone": phone,
            "otpHash": _hash_otp(otp),
            "expiresAt": expires_at,
        }
    )
    logger.warning("[DEV ONLY] OTP for %s: %s", phone, otp)
    return {"message": "OTP sent successfully", "expires_in": 300}


async def verify_otp(db: Prisma, phone: str, otp: str) -> dict[str, object]:
    """Verify an OTP and return tokens + customer summary."""

    if settings.twilio_configured:
        ok = await twilio_verify.verify_otp(phone, otp)
        if not ok:
            raise HTTPException(status_code=401, detail="Invalid OTP.")
    else:
        # Dev fallback â€” look up the hash in OtpCode table
        record = await db.otpcode.find_first(
            where={
                "phone": phone,
                "verified": False,
                "expiresAt": {"gt": datetime.now(UTC)},
            },
            order={"createdAt": "desc"},
        )
        if record is None:
            raise HTTPException(
                status_code=401, detail="No OTP found for this number. Request a new one."
            )
        if not hmac.compare_digest(record.otpHash, _hash_otp(otp)):
            raise HTTPException(status_code=401, detail="Invalid OTP.")
        await db.otpcode.delete(where={"id": record.id})

    # Find or create the customer
    customer = await db.customer.find_unique(where={"phone": phone})
    if customer is None:
        customer = await db.customer.create(data={"phone": phone, "fullName": ""})

    access, refresh = issue_pair(sub=customer.id, role="customer")
    return {
        "access_token": access,
        "refresh_token": refresh,
        "customer": {
            "id": customer.id,
            "phone": customer.phone,
            "fullName": customer.fullName,
            "kycStatus": customer.kycStatus.value if customer.kycStatus else None,
            "preferredLanguage": (
                customer.preferredLanguage.value if customer.preferredLanguage else None
            ),
        },
    }


async def admin_login(db: Prisma, email: str, password: str) -> dict[str, object]:
    """Email/password login for admin users with constant-time bcrypt compare."""
    admin = await db.adminuser.find_unique(where={"email": email})

    # Constant-time bcrypt compare even when user not found â€” prevents timing attacks.
    dummy_hash = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"
    target_hash = admin.password if admin else dummy_hash
    password_valid = bcrypt.verify(password, target_hash)

    if not admin or not admin.isActive or not password_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    role_str = admin.role.value if hasattr(admin.role, "value") else str(admin.role)
    access, refresh = issue_pair(sub=admin.id, role=role_str)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "fullName": admin.fullName,
            "role": role_str,
        },
    }


def refresh_tokens(refresh_token: str) -> dict[str, str]:
    """Issue a new token pair from a valid refresh token."""
    try:
        payload = verify_refresh_token(refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.") from e

    sub = payload.get("sub")
    role = payload.get("role")
    if not isinstance(sub, str) or not isinstance(role, str):
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    access, refresh = issue_pair(sub=sub, role=role)
    return {"access_token": access, "refresh_token": refresh}
