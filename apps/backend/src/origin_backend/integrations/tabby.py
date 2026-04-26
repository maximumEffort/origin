"""
Tabby BNPL integration.

Mirrors apps/backend/src/integrations/tabby/tabby.service.ts.

Tabby splits payments into 4 instalments (popular in UAE/GCC). Flow:
  1. createSession → returns hosted-page URL
  2. Customer pays on Tabby → redirected back to success/cancel/failure
  3. Verify with getPayment(id) — or rely on webhook
  4. capturePayment(id) once the booking/lease is confirmed

Failures here surface as HTTPException(400) since callers (booking flow,
admin reconciliation) need to know creation/capture failed. Eligibility
check returns False on any error.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException, status

from origin_backend.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.tabby.ai/api/v2"


@dataclass(frozen=True)
class TabbyItem:
    title: str
    quantity: int
    unitPriceAed: float
    description: str | None = None


@dataclass(frozen=True)
class TabbySessionRequest:
    amountAed: float
    orderReference: str
    customerName: str
    customerEmail: str
    customerPhone: str
    successUrl: str
    cancelUrl: str
    failureUrl: str
    items: list[TabbyItem]


@dataclass(frozen=True)
class TabbySession:
    sessionId: str
    paymentUrl: str
    status: str


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.tabby_api_key or ''}",
        "Content-Type": "application/json",
    }


async def create_session(req: TabbySessionRequest) -> TabbySession:
    """Create a Tabby checkout session; returns the redirect URL."""
    payload = {
        "payment": {
            "amount": f"{req.amountAed:.2f}",
            "currency": "AED",
            "description": f"Lease booking {req.orderReference}",
            "buyer": {
                "phone": req.customerPhone,
                "email": req.customerEmail,
                "name": req.customerName,
            },
            "order": {
                "reference_id": req.orderReference,
                "items": [
                    {
                        "title": item.title,
                        "description": item.description or item.title,
                        "quantity": item.quantity,
                        "unit_price": f"{item.unitPriceAed:.2f}",
                        "discount_amount": "0.00",
                        "reference_id": req.orderReference,
                        "image_url": "",
                        "product_url": "",
                        "category": "Transportation",
                    }
                    for item in req.items
                ],
            },
            "buyer_history": {
                "registered_since": datetime.now(UTC).isoformat(),
                "loyalty_level": 0,
            },
            "order_history": [],
            "meta": {"order_id": req.orderReference, "customer": req.customerEmail},
        },
        "lang": "en",
        "merchant_code": settings.tabby_merchant_code or "",
        "merchant_urls": {
            "success": req.successUrl,
            "cancel": req.cancelUrl,
            "failure": req.failureUrl,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(f"{BASE_URL}/checkout", json=payload, headers=_headers())
            r.raise_for_status()
            data: dict[str, Any] = r.json()
    except httpx.HTTPError as e:
        logger.error("Tabby session failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tabby checkout failed",
        ) from e

    config = data.get("configuration") or {}
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tabby session created but no configuration returned",
        )

    instalments = (config.get("available_products") or {}).get("installments") or []
    web_url = instalments[0].get("web_url", "") if instalments else ""

    return TabbySession(
        sessionId=data.get("id", ""),
        paymentUrl=web_url,
        status=data.get("status", ""),
    )


async def get_payment(payment_id: str) -> dict[str, Any]:
    """Fetch a Tabby payment by id (used to verify status post-redirect)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{BASE_URL}/payments/{payment_id}", headers=_headers())
            r.raise_for_status()
            return r.json()  # type: ignore[no-any-return]
    except httpx.HTTPError as e:
        logger.error("Tabby get_payment failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve Tabby payment",
        ) from e


async def capture_payment(payment_id: str, amount_aed: float) -> None:
    """Capture an authorised Tabby payment."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{BASE_URL}/payments/{payment_id}/captures",
                json={"amount": f"{amount_aed:.2f}"},
                headers=_headers(),
            )
            r.raise_for_status()
    except httpx.HTTPError as e:
        logger.error("Tabby capture failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tabby payment capture failed",
        ) from e
    logger.info("Tabby payment captured: %s", payment_id)


async def check_eligibility(phone: str, email: str, amount_aed: float) -> bool:
    """
    Pre-flight: is this customer eligible for Tabby on this amount?
    Returns False on any error (matches the Node behaviour).
    """
    payload = {
        "payment": {
            "amount": f"{amount_aed:.2f}",
            "currency": "AED",
            "description": "Eligibility check",
            "buyer": {"phone": phone, "email": email, "name": ""},
            "order": {"reference_id": "eligibility-check", "items": []},
            "order_history": [],
        },
        "merchant_code": settings.tabby_merchant_code or "",
        "merchant_urls": {"success": "", "cancel": "", "failure": ""},
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(f"{BASE_URL}/checkout", json=payload, headers=_headers())
            r.raise_for_status()
            data = r.json()
        return bool(data.get("status") == "created")
    except Exception:
        return False
