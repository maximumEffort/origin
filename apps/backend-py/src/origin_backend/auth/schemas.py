"""
Pydantic request/response schemas for the auth endpoints.

These are the equivalent of NestJS DTOs. They give us:
  - Automatic validation (FastAPI returns 400 if shape is wrong)
  - Auto-generated OpenAPI docs
  - Type safety throughout the handler
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Request schemas ──────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    phone: str = Field(..., description="UAE mobile in +971XXXXXXXXX format")

    @field_validator("phone")
    @classmethod
    def validate_uae_phone(cls, v: str) -> str:
        cleaned = v.replace(" ", "")
        # +971 followed by 8 or 9 digits (some legacy numbers are 8)
        if not cleaned.startswith("+971") or not cleaned[4:].isdigit() or not (8 <= len(cleaned[4:]) <= 9):
            raise ValueError("Phone must be a valid UAE number (+971XXXXXXXXX)")
        return cleaned


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str = Field(..., min_length=4, max_length=8)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=200)


# ── Response schemas ─────────────────────────────────────────────

class CustomerSummary(BaseModel):
    id: str
    phone: str
    full_name: str = Field(..., alias="fullName")
    kyc_status: str | None = Field(default=None, alias="kycStatus")
    preferred_language: str | None = Field(default=None, alias="preferredLanguage")

    model_config = {"populate_by_name": True}


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str


class OtpVerifyResponse(TokenPair):
    customer: CustomerSummary


class AdminSummary(BaseModel):
    id: str
    email: str
    full_name: str = Field(..., alias="fullName")
    role: str

    model_config = {"populate_by_name": True}


class AdminLoginResponse(TokenPair):
    admin: AdminSummary


class MessageResponse(BaseModel):
    message: str
    expires_in: int = 300
