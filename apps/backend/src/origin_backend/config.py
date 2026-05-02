"""Runtime configuration. Loaded once at import time from env vars."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # Core
    app_env: str = Field(default="development")
    app_port: int = Field(default=8080)
    log_level: str = Field(default="info")

    # Database
    database_url: str = Field(default="")

    # Auth
    jwt_secret: str = Field(default="")
    jwt_access_ttl_seconds: int = Field(default=900)
    jwt_refresh_ttl_seconds: int = Field(default=30 * 24 * 3600)

    # CORS
    cors_allowed_origins: str = Field(default="")

    # Azure Blob
    azure_storage_blob_endpoint: str = Field(default="")
    azure_storage_kyc_container: str = Field(default="kyc-documents")
    azure_storage_vehicle_container: str = Field(default="vehicle-imagery")

    # Azure Document Intelligence
    azure_docintel_endpoint: str = Field(default="")
    kyc_ocr_enabled: bool = Field(default=False)

    # Stripe
    stripe_secret_key: str = Field(default="")
    stripe_webhook_secret: str = Field(default="")

    # Twilio
    twilio_account_sid: str = Field(default="")
    twilio_auth_token: str = Field(default="")
    twilio_verify_service_sid: str = Field(default="")

    # SendGrid
    sendgrid_api_key: str = Field(default="")
    sendgrid_from_email: str = Field(default="no-reply@origin-auto.ae")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
