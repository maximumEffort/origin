"""
WhatsApp Business integration (Meta Cloud API).

Mirrors apps/backend/src/integrations/whatsapp/whatsapp.service.ts.

Uses Graph API v19. Templates are pre-approved in WhatsApp Manager;
parameter ordering matches the Node service so existing templates keep
working without changes.

If WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is unset, every
call is a clean no-op — same as the Node service.

All sends are best-effort. Failures are logged but never re-raised so a
WhatsApp outage can't fail a booking, KYC step, or admin action.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Callable
from typing import Literal, TypedDict

import httpx

from origin_backend.config import settings

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v19.0"

WhatsAppLanguage = Literal["en", "ar", "zh"]


class _Variant(TypedDict):
    name: str
    params: Callable[[dict[str, str]], list[str]]


# Template variable order must match the Meta-side template definitions.
TEMPLATES: dict[str, dict[WhatsAppLanguage, _Variant]] = {
    "BOOKING_CONFIRMED": {
        "en": {
            "name": "booking_confirmed_en",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["startDate"],
                p["bookingRef"],
            ],
        },
        "ar": {
            "name": "booking_confirmed_ar",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["startDate"],
                p["bookingRef"],
            ],
        },
        "zh": {
            "name": "booking_confirmed_zh",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["startDate"],
                p["bookingRef"],
            ],
        },
    },
    "BOOKING_APPROVED": {
        "en": {
            "name": "booking_approved_en",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["startDate"],
                p["portalUrl"],
            ],
        },
        "ar": {
            "name": "booking_approved_ar",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["startDate"],
                p["portalUrl"],
            ],
        },
        "zh": {
            "name": "booking_approved_zh",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["startDate"],
                p["portalUrl"],
            ],
        },
    },
    "PAYMENT_REMINDER": {
        "en": {
            "name": "payment_reminder_en",
            "params": lambda p: [p["customerName"], p["amount"], p["dueDate"], p["portalUrl"]],
        },
        "ar": {
            "name": "payment_reminder_ar",
            "params": lambda p: [p["customerName"], p["amount"], p["dueDate"], p["portalUrl"]],
        },
        "zh": {
            "name": "payment_reminder_zh",
            "params": lambda p: [p["customerName"], p["amount"], p["dueDate"], p["portalUrl"]],
        },
    },
    "LEASE_EXPIRY_REMINDER": {
        "en": {
            "name": "lease_expiry_en",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["endDate"],
                p["daysLeft"],
                p["renewalUrl"],
            ],
        },
        "ar": {
            "name": "lease_expiry_ar",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["endDate"],
                p["daysLeft"],
                p["renewalUrl"],
            ],
        },
        "zh": {
            "name": "lease_expiry_zh",
            "params": lambda p: [
                p["customerName"],
                p["vehicleName"],
                p["endDate"],
                p["daysLeft"],
                p["renewalUrl"],
            ],
        },
    },
    "KYC_PENDING": {
        "en": {
            "name": "kyc_pending_en",
            "params": lambda p: [p["customerName"], p["missingDocs"], p["uploadUrl"]],
        },
        "ar": {
            "name": "kyc_pending_ar",
            "params": lambda p: [p["customerName"], p["missingDocs"], p["uploadUrl"]],
        },
        "zh": {
            "name": "kyc_pending_zh",
            "params": lambda p: [p["customerName"], p["missingDocs"], p["uploadUrl"]],
        },
    },
    "WELCOME": {
        "en": {
            "name": "welcome_en",
            "params": lambda p: [p["customerName"], p["catalogueUrl"]],
        },
        "ar": {
            "name": "welcome_ar",
            "params": lambda p: [p["customerName"], p["catalogueUrl"]],
        },
        "zh": {
            "name": "welcome_zh",
            "params": lambda p: [p["customerName"], p["catalogueUrl"]],
        },
    },
}

_LANGUAGE_CODE: dict[WhatsAppLanguage, str] = {"en": "en", "ar": "ar", "zh": "zh_CN"}


def is_configured() -> bool:
    return settings.whatsapp_configured


def _api_url() -> str:
    return f"https://graph.facebook.com/{GRAPH_API_VERSION}/{settings.whatsapp_phone_number_id}/messages"


def _normalise_phone(phone: str) -> str:
    """E.164 — strip non-digits, ensure +971 prefix."""
    digits = re.sub(r"\D", "", phone)
    return f"+{digits}" if digits.startswith("971") else f"+971{digits}"


async def _post(body: dict[str, object]) -> None:
    if not settings.whatsapp_configured:
        return
    headers = {
        "Authorization": f"Bearer {settings.whatsapp_access_token}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(_api_url(), json=body, headers=headers)
            r.raise_for_status()
    except httpx.HTTPError as e:
        logger.error("WhatsApp send failed: %s", e)


async def send_template(
    to: str,
    template_key: str,
    params: dict[str, str],
    language: WhatsAppLanguage = "en",
) -> None:
    """Send a pre-approved WhatsApp template message."""
    variant = TEMPLATES.get(template_key, {}).get(language)
    if variant is None:
        logger.warning("Unknown WhatsApp template: %s / %s", template_key, language)
        return

    components = [
        {
            "type": "body",
            "parameters": [{"type": "text", "text": v} for v in variant["params"](params)],
        }
    ]
    body: dict[str, object] = {
        "messaging_product": "whatsapp",
        "to": _normalise_phone(to),
        "type": "template",
        "template": {
            "name": variant["name"],
            "language": {"code": _LANGUAGE_CODE[language]},
            "components": components,
        },
    }
    await _post(body)
    logger.info("WhatsApp template sent: %s → %s", template_key, to)


async def send_text(to: str, text: str) -> None:
    """Free-text message (only valid inside the 24-hour service window)."""
    body = {
        "messaging_product": "whatsapp",
        "to": _normalise_phone(to),
        "type": "text",
        "text": {"body": text},
    }
    await _post(body)


# ── Convenience wrappers (match the Node service's surface) ─────────────


async def send_booking_confirmation(
    to: str, params: dict[str, str], lang: WhatsAppLanguage = "en"
) -> None:
    await send_template(to, "BOOKING_CONFIRMED", params, lang)


async def send_booking_approved(
    to: str, params: dict[str, str], lang: WhatsAppLanguage = "en"
) -> None:
    await send_template(to, "BOOKING_APPROVED", params, lang)


async def send_payment_reminder(
    to: str, params: dict[str, str], lang: WhatsAppLanguage = "en"
) -> None:
    await send_template(to, "PAYMENT_REMINDER", params, lang)


async def send_lease_expiry_reminder(
    to: str, params: dict[str, str], lang: WhatsAppLanguage = "en"
) -> None:
    await send_template(to, "LEASE_EXPIRY_REMINDER", params, lang)


async def send_kyc_pending_alert(
    to: str, params: dict[str, str], lang: WhatsAppLanguage = "en"
) -> None:
    await send_template(to, "KYC_PENDING", params, lang)


async def send_welcome(to: str, params: dict[str, str], lang: WhatsAppLanguage = "en") -> None:
    await send_template(to, "WELCOME", params, lang)
