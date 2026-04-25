"""
Application settings.

Reads from environment variables (validated by Pydantic) so no secrets
ever live in source. Mirrors the env contract of the NestJS backend
defined in apps/backend/.env.example.

Usage:
    from origin_backend.config import settings
    print(settings.database_url)
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated settings object. Fails fast at import time if required env is missing."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Tolerate extra env vars (e.g., shared with Node backend)
    )

    # ── App ──
    app_env: Literal["development", "staging", "production"] = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 3001
    log_level: Literal["debug", "info", "warning", "error"] = "info"

    # ── Database ──
    database_url: str = Field(..., description="Postgres URL (pooled). Required.")
    direct_url: str | None = Field(default=None, description="Direct (non-pooled) URL for migrations.")

    # ── JWT ──
    jwt_secret: str = Field(..., min_length=16, description="JWT signing secret. Required.")
    jwt_refresh_secret: str | None = Field(
        default=None,
        description="Refresh token signing secret. Falls back to JWT_SECRET if unset (not recommended in prod).",
    )
    jwt_access_expires_minutes: int = 15
    jwt_refresh_expires_days: int = 30

    # ── Twilio (OTP) ──
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_verify_service_sid: str | None = None

    # ── SendGrid ──
    sendgrid_api_key: str | None = None
    sendgrid_from_email: str = "noreply@origin-auto.ae"
    sendgrid_from_name: str = "Origin"

    # ── Stripe ──
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None

    # ── CORS ──
    cors_allowed_origins: str = "http://localhost:3000,http://localhost:3002"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def twilio_configured(self) -> bool:
        return bool(self.twilio_account_sid and self.twilio_verify_service_sid)


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor. Use this instead of constructing Settings() directly."""
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
