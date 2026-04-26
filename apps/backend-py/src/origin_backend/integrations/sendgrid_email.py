"""
SendGrid integration — transactional emails via Dynamic Templates.

Mirrors apps/backend/src/integrations/sendgrid/sendgrid.service.ts.

If SENDGRID_API_KEY is unset (or doesn't start with `SG.`), the module
becomes a no-op — calls log a warning and return cleanly. This matches
the Node behaviour and keeps dev/test environments friction-free.

Email sends are fire-and-forget from the caller's point of view: failures
are logged at error level but never re-raised. Booking creation, KYC
rejection, etc. should never fail because mail is down.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any, Literal

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from origin_backend.config import settings

logger = logging.getLogger(__name__)

EmailLanguage = Literal["en", "ar", "zh"]

# Dynamic Template IDs — keys mirror the Node `EMAIL_TEMPLATES` constant.
EMAIL_TEMPLATES: dict[str, dict[str, str]] = {
    "BOOKING_CONFIRMED": {
        "en": "d-booking-confirmed-en",
        "ar": "d-booking-confirmed-ar",
        "zh": "d-booking-confirmed-zh",
    },
    "BOOKING_APPROVED": {
        "en": "d-booking-approved-en",
        "ar": "d-booking-approved-ar",
        "zh": "d-booking-approved-zh",
    },
    "PAYMENT_RECEIPT": {
        "en": "d-payment-receipt-en",
        "ar": "d-payment-receipt-ar",
        "zh": "d-payment-receipt-zh",
    },
    "PAYMENT_REMINDER": {
        "en": "d-payment-reminder-en",
        "ar": "d-payment-reminder-ar",
        "zh": "d-payment-reminder-zh",
    },
    "LEASE_EXPIRY": {
        "en": "d-lease-expiry-en",
        "ar": "d-lease-expiry-ar",
        "zh": "d-lease-expiry-zh",
    },
    "KYC_INCOMPLETE": {
        "en": "d-kyc-incomplete-en",
        "ar": "d-kyc-incomplete-ar",
        "zh": "d-kyc-incomplete-zh",
    },
    "WELCOME": {
        "en": "d-welcome-en",
        "ar": "d-welcome-ar",
        "zh": "d-welcome-zh",
    },
}


@lru_cache
def _client() -> SendGridAPIClient | None:
    """Lazy-init SendGrid client; returns None when not configured."""
    api_key = settings.sendgrid_api_key
    if not api_key or not api_key.startswith("SG."):
        logger.warning("SENDGRID_API_KEY not configured — email sending disabled")
        return None
    return SendGridAPIClient(api_key)


def is_configured() -> bool:
    return _client() is not None


async def send_template_email(
    to: str,
    template_key: str,
    dynamic_data: dict[str, Any],
    language: EmailLanguage = "en",
) -> None:
    """
    Send a transactional email using a SendGrid Dynamic Template.

    Failures are logged but never re-raised — the caller should treat
    this as fire-and-forget.
    """
    template_id = EMAIL_TEMPLATES.get(template_key, {}).get(language)
    if not template_id:
        logger.warning("Unknown email template: %s / %s", template_key, language)
        return

    client = _client()
    if client is None:
        return

    message = Mail(
        from_email=(settings.sendgrid_from_email, settings.sendgrid_from_name),
        to_emails=to,
    )
    message.template_id = template_id
    message.dynamic_template_data = {
        **dynamic_data,
        "companyName": "[Company Name]",
        "supportEmail": settings.sendgrid_from_email,
        "year": datetime.now(UTC).year,
    }

    try:
        # SendGrid SDK is sync; offload to a worker thread.
        await asyncio.to_thread(client.send, message)
        logger.info("Email sent: %s → %s", template_key, to)
    except Exception as e:
        # Non-fatal: never let an email failure trip a request handler.
        logger.error("SendGrid failed for %s → %s: %s", template_key, to, e)


# ── Convenience wrappers (match the Node service's surface) ──────────────


async def send_booking_confirmation(
    to: str, data: dict[str, Any], lang: EmailLanguage = "en"
) -> None:
    await send_template_email(to, "BOOKING_CONFIRMED", data, lang)


async def send_booking_approved(
    to: str, data: dict[str, Any], lang: EmailLanguage = "en"
) -> None:
    await send_template_email(to, "BOOKING_APPROVED", data, lang)


async def send_payment_receipt(
    to: str, data: dict[str, Any], lang: EmailLanguage = "en"
) -> None:
    await send_template_email(to, "PAYMENT_RECEIPT", data, lang)


async def send_lease_expiry_reminder(
    to: str, data: dict[str, Any], lang: EmailLanguage = "en"
) -> None:
    await send_template_email(to, "LEASE_EXPIRY", data, lang)


async def send_kyc_incomplete_alert(
    to: str, data: dict[str, Any], lang: EmailLanguage = "en"
) -> None:
    await send_template_email(to, "KYC_INCOMPLETE", data, lang)


async def send_welcome(to: str, data: dict[str, Any], lang: EmailLanguage = "en") -> None:
    await send_template_email(to, "WELCOME", data, lang)
