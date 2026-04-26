"""
Stripe integration — PaymentIntent creation for deposits / reservations.

Mirrors apps/backend/src/payments/stripe.service.ts. Stripe is optional
in dev — if STRIPE_SECRET_KEY is unset (or doesn't start with `sk_`) the
client is None and any payment endpoint will surface a clear error.

The Stripe Python SDK is sync-blocking; we run it on a worker thread via
`asyncio.to_thread` so we don't stall the FastAPI event loop.
"""

from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from typing import Any

import stripe

from origin_backend.config import settings

logger = logging.getLogger(__name__)


@lru_cache
def _client() -> Any | None:
    """Lazy-init Stripe client. Returns None if not configured."""
    secret = settings.stripe_secret_key
    if not secret or not secret.startswith("sk_"):
        logger.warning("Stripe secret key not configured — payments disabled")
        return None
    stripe.api_key = secret
    return stripe


def is_configured() -> bool:
    return _client() is not None


async def create_payment_intent(
    amount_aed: float,
    metadata: dict[str, str] | None = None,
) -> dict[str, str]:
    """Create a Stripe PaymentIntent in AED. Amount is in AED, not fils."""
    client = _client()
    if client is None:
        raise RuntimeError("Stripe is not configured")

    # Stripe expects the smallest currency unit (fils for AED).
    amount_fils = round(amount_aed * 100)

    intent = await asyncio.to_thread(
        client.PaymentIntent.create,
        amount=amount_fils,
        currency="aed",
        metadata=metadata or {},
        automatic_payment_methods={"enabled": True},
    )

    return {
        "clientSecret": intent.client_secret,
        "paymentIntentId": intent.id,
    }
