"""
Auth endpoints — mirrors apps/backend/src/auth/auth.controller.ts:

    POST /auth/otp/send       Send OTP (Twilio Verify in prod)
    POST /auth/otp/verify     Verify OTP, return tokens + customer
    POST /auth/refresh        Exchange refresh token for new pair
    POST /auth/admin/login    Admin email/password login
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from origin_backend.auth import service
from origin_backend.auth.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    MessageResponse,
    OtpVerifyResponse,
    RefreshTokenRequest,
    SendOtpRequest,
    TokenPair,
    VerifyOtpRequest,
)
from origin_backend.common.prisma import get_db
from prisma import Prisma

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/send", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def send_otp_endpoint(
    body: SendOtpRequest,
    db: Prisma = Depends(get_db),
) -> dict[str, object]:
    """Send an OTP via SMS to a UAE mobile number."""
    return await service.send_otp(db, body.phone)


@router.post("/otp/verify", response_model=OtpVerifyResponse)
async def verify_otp_endpoint(
    body: VerifyOtpRequest,
    db: Prisma = Depends(get_db),
) -> dict[str, object]:
    """Verify the OTP and return tokens + the customer profile."""
    return await service.verify_otp(db, body.phone, body.otp)


@router.post("/refresh", response_model=TokenPair)
async def refresh_endpoint(body: RefreshTokenRequest) -> dict[str, str]:
    """Exchange a refresh token for a new access + refresh pair."""
    return service.refresh_tokens(body.refresh_token)


@router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login_endpoint(
    body: AdminLoginRequest,
    db: Prisma = Depends(get_db),
) -> dict[str, object]:
    """Email/password login for admin users."""
    return await service.admin_login(db, str(body.email), body.password)
