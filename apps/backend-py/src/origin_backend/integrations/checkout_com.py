"""
Checkout.com integration — hosted card / Apple Pay / Google Pay.

Mirrors apps/backend/src/integrations/checkout/checkout.service.ts.

Amounts on the wire are in fils (1/100 AED). 3DS is enabled — UAE card
payments require it. Webhook signatures are HMAC-SHA256 over the raw
request body.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx
from fastapi import HTTPException, status

from origin_backend.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.checkout.com"


@dataclass(frozen=True)
class PaymentSessionRequest:
    amountAed: float
    reference: str
    customerName: str
    customerEmail: str
    customerPhone: str
    successUrl: str
    failureUrl: str
    cancelUrl: str
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class PaymentSession:
    sessionId: str
    paymentUrl: str
    expiresAt: str


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.checkout_secret_key or ''}",
        "Content-Type": "application/json",
    }


async def create_payment_session(req: PaymentSessionRequest) -> PaymentSession:
    """Create a hosted payment session; returns the redirect URL."""
    amount_fils = round(req.amountAed * 100)
    payload: dict[str, Any] = {
        "amount": amount_fils,
        "currency": "AED",
        "reference": req.reference,
        "billing": {"address": {"country": "AE"}},
        "customer": {
            "name": req.customerName,
            "email": req.customerEmail,
            "phone": {"number": req.customerPhone, "country_code": "+971"},
        },
        "success_url": req.successUrl,
        "failure_url": req.failureUrl,
        "cancel_url": req.cancelUrl,
        "payment_method_types": ["card", "applepay", "googlepay"],
        "3ds": {"enabled": True},
        "metadata": req.metadata,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(f"{BASE_URL}/payment-sessions", json=payload, headers=_headers())
            r.raise_for_status()
            data: dict[str, Any] = r.json()
    except httpx.HTTPError as e:
        logger.error("Checkout.com session failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment session creation failed",
        ) from e

    redirect = (data.get("_links") or {}).get("redirect") or {}
    return PaymentSession(
        sessionId=data.get("id", ""),
        paymentUrl=redirect.get("href", ""),
        expiresAt=data.get("expires_on", ""),
    )


async def get_payment(payment_id: str) -> dict[str, Any]:
    """Fetch a payment by id."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{BASE_URL}/payments/{payment_id}", headers=_headers())
        r.raise_for_status()
        return r.json()  # type: ignore[no-any-return]


async def refund(
    payment_id: str, *, amount_aed: float | None = None, reference: str | None = None
) -> None:
    """Issue a full or partial refund."""
    body: dict[str, Any] = {}
    if amount_aed is not None:
        body["amount"] = round(amount_aed * 100)
    if reference is not None:
        body["reference"] = reference

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{BASE_URL}/payments/{payment_id}/refunds", json=body, headers=_headers()
            )
            r.raise_for_status()
    except httpx.HTTPError as e:
        logger.error("Refund failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund failed",
        ) from e
    logger.info("Refund issued for payment %s", payment_id)


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Constant-time HMAC-SHA256 verification of a Checkout.com webhook."""
    secret = settings.checkout_webhook_secret
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)


def calculate_with_vat(base_aed: float) -> dict[str, float]:
    """Return {base, vat, total} with 5% VAT — mirrors the Node helper."""
    vat = round(base_aed * 0.05 * 100) / 100
    total = round((base_aed + vat) * 100) / 100
    return {"base": base_aed, "vat": vat, "total": total}
