"""
JWT token issuance and verification.

Uses python-jose with HS256 (matches the Node backend's HMAC signing).
Two token types: access (short-lived) and refresh (long-lived).
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Literal, TypedDict

from jose import JWTError, jwt

from origin_backend.config import settings

ALGORITHM = "HS256"


class TokenPayload(TypedDict):
    sub: str  # User ID
    role: str  # 'customer' | 'SUPER_ADMIN' | 'FLEET_MANAGER' | etc.
    type: Literal["access", "refresh"]
    exp: int  # Unix timestamp


def _now() -> datetime:
    return datetime.now(UTC)


def _sign(payload: dict[str, object], secret: str) -> str:
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def _verify(token: str, secret: str) -> dict[str, object]:
    try:
        return jwt.decode(token, secret, algorithms=[ALGORITHM])
    except JWTError as e:
        raise ValueError(f"Invalid or expired token: {e}") from e


def issue_access_token(*, sub: str, role: str) -> str:
    expires = _now() + timedelta(minutes=settings.jwt_access_expires_minutes)
    payload = {
        "sub": sub,
        "role": role,
        "type": "access",
        "exp": int(expires.timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    return _sign(payload, settings.jwt_secret)


def issue_refresh_token(*, sub: str, role: str) -> str:
    expires = _now() + timedelta(days=settings.jwt_refresh_expires_days)
    payload = {
        "sub": sub,
        "role": role,
        "type": "refresh",
        "exp": int(expires.timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    refresh_secret = settings.jwt_refresh_secret or settings.jwt_secret
    return _sign(payload, refresh_secret)


def issue_pair(*, sub: str, role: str) -> tuple[str, str]:
    """Convenience: issue both access + refresh in one call."""
    return issue_access_token(sub=sub, role=role), issue_refresh_token(sub=sub, role=role)


def verify_access_token(token: str) -> dict[str, object]:
    payload = _verify(token, settings.jwt_secret)
    if payload.get("type") != "access":
        raise ValueError("Token is not an access token")
    return payload


def verify_refresh_token(token: str) -> dict[str, object]:
    refresh_secret = settings.jwt_refresh_secret or settings.jwt_secret
    payload = _verify(token, refresh_secret)
    if payload.get("type") != "refresh":
        raise ValueError("Token is not a refresh token")
    return payload
