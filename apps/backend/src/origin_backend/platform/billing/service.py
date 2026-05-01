"""Billing platform service helpers."""

from __future__ import annotations

from typing import Any

from origin_backend.platform.countries.service import get_default_legal_entity


async def get_invoice_context(db: Any, *, country: Any) -> dict[str, Any]:
    legal_entity = await get_default_legal_entity(db, country.id)
    return {
        "countryId": country.id,
        "currencyCode": country.defaultCurrencyCode,
        "vatRate": float(country.vatRate),
        "legalEntity": legal_entity,
    }


async def create_deposit_checkout(
    db: Any,
    *,
    country_id: str,
    currency_code: str,
    booking_id: str,
    amount: float,
) -> dict[str, Any]:
    # Adapter integration happens under services/payments. This is deliberately
    # a stable billing contract for product modules and gateways.
    return {
        "countryId": country_id,
        "currencyCode": currency_code,
        "bookingId": booking_id,
        "amount": amount,
        "status": "PENDING",
    }

