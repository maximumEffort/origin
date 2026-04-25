"""
Twilio Verify integration — phone OTP send + verify.

In production we use Twilio Verify (Twilio generates and sends the code,
we just call their API to verify). In dev (when Twilio env vars are unset),
we fall back to a local DB-backed OTP for offline development.

Mirrors the behaviour of apps/backend/src/integrations/twilio/twilio.service.ts
"""

from __future__ import annotations

import logging
from functools import lru_cache

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client as TwilioClient

from origin_backend.config import settings

logger = logging.getLogger(__name__)


@lru_cache
def _client() -> TwilioClient | None:
    """Lazy-init Twilio client. Returns None if not configured."""
    if not settings.twilio_configured:
        return None
    return TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)


async def send_otp(phone: str) -> None:
    """Send an OTP to the given phone via Twilio Verify."""
    client = _client()
    if client is None:
        raise RuntimeError("Twilio is not configured")

    try:
        client.verify.v2.services(
            settings.twilio_verify_service_sid
        ).verifications.create(to=phone, channel="sms")
    except TwilioRestException as e:
        logger.error("twilio send_otp failed: %s", e)
        raise


async def verify_otp(phone: str, code: str) -> bool:
    """Verify an OTP. Returns True on success, False on invalid/expired."""
    client = _client()
    if client is None:
        raise RuntimeError("Twilio is not configured")

    try:
        check = client.verify.v2.services(
            settings.twilio_verify_service_sid
        ).verification_checks.create(to=phone, code=code)
        return bool(check.status == "approved")
    except TwilioRestException as e:
        # 60200 = invalid parameter (often: code expired/wrong)
        # 20404 = verification not found (already approved or expired)
        if e.code in (60200, 20404):
            return False
        logger.error("twilio verify_otp failed: %s", e)
        raise
