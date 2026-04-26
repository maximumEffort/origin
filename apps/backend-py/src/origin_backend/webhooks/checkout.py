"""
Checkout.com webhook receiver.

Mirrors apps/backend/src/integrations/checkout/checkout-webhook.controller.ts.

    POST /v1/webhooks/checkout

Signature verification is HMAC-SHA256 over the raw body. We MUST read
`request.body()` (not the parsed JSON) so the bytes match what
Checkout.com signed.

Events handled:
    payment_approved  → mark Payment as PAID (or Booking deposit paid)
                        + send receipt email
    payment_declined  → mark Payment as OVERDUE
    payment_refunded  → mark Payment as REFUNDED
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from origin_backend.common.prisma import get_db
from origin_backend.integrations import checkout_com, sendgrid_email
from prisma import Prisma

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/checkout", tags=["webhooks"])


def _enum_value(v: Any) -> str | None:
    if v is None:
        return None
    return v.value if hasattr(v, "value") else str(v)


@router.post("", status_code=status.HTTP_200_OK)
async def checkout_webhook_endpoint(
    request: Request,
    cko_signature: str | None = Header(default=None, alias="cko-signature"),
    db: Prisma = Depends(get_db),
) -> dict[str, bool]:
    raw_body = await request.body()
    if not checkout_com.verify_webhook_signature(raw_body, cko_signature or ""):
        logger.warning("Checkout webhook: invalid signature")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid webhook signature"
        )

    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook body is not valid JSON",
        ) from e

    event_type = event.get("type")
    data = event.get("data") or {}
    logger.info("Checkout event: %s — %s", event_type, data.get("id"))

    if event_type == "payment_approved":
        await _handle_payment_approved(db, data)
    elif event_type == "payment_declined":
        await _handle_payment_declined(db, data)
    elif event_type == "payment_refunded":
        await _handle_payment_refunded(db, data)
    else:
        logger.info("Unhandled Checkout event: %s", event_type)

    return {"received": True}


async def _handle_payment_approved(db: Prisma, data: dict[str, Any]) -> None:
    reference = data.get("reference")
    payment_id = data.get("id")
    amount_aed = (data.get("amount") or 0) / 100

    logger.info("Payment approved: %s — %s AED (ref: %s)", payment_id, amount_aed, reference)

    updated = await db.payment.update_many(
        where={"gatewayReference": reference, "status": "PENDING"},
        data={
            "status": "PAID",
            "paidAt": datetime.now(UTC),
            "gateway": "CHECKOUT_COM",
        },
    )

    if getattr(updated, "count", 0) > 0:
        logger.info("Marked %s payment(s) as PAID for ref %s", updated.count, reference)
        # Best-effort receipt email.
        payment = await db.payment.find_first(
            where={"gatewayReference": reference},
            include={"lease": {"include": {"customer": True}}},
        )
        customer = getattr(getattr(payment, "lease", None), "customer", None)
        if customer is not None and customer.email:
            lang = _enum_value(customer.preferredLanguage) or "en"
            await sendgrid_email.send_payment_receipt(
                customer.email,
                {
                    "reference": reference,
                    "amountAed": amount_aed,
                    "paidAt": datetime.now(UTC).date().isoformat(),
                    "customerName": customer.fullName,
                },
                lang,  # type: ignore[arg-type]
            )
        return

    # Fallback: deposit on a booking (no Payment row yet).
    booking = await db.booking.find_unique(
        where={"reference": reference},
        include={"customer": True},
    )
    if booking is None:
        logger.warning("No payment or booking found for reference: %s", reference)
        return

    await db.booking.update(where={"id": booking.id}, data={"depositPaid": True})
    logger.info("Deposit marked paid for booking %s", reference)

    customer = getattr(booking, "customer", None)
    if customer is not None and customer.email:
        lang = _enum_value(customer.preferredLanguage) or "en"
        await sendgrid_email.send_payment_receipt(
            customer.email,
            {
                "reference": reference,
                "amountAed": amount_aed,
                "paidAt": datetime.now(UTC).date().isoformat(),
                "customerName": customer.fullName,
            },
            lang,  # type: ignore[arg-type]
        )


async def _handle_payment_declined(db: Prisma, data: dict[str, Any]) -> None:
    reference = data.get("reference")
    logger.warning("Payment declined: %s (ref: %s)", data.get("id"), reference)
    updated = await db.payment.update_many(
        where={"gatewayReference": reference, "status": "PENDING"},
        data={"status": "OVERDUE"},
    )
    logger.info(
        "Marked %s payment(s) as OVERDUE for ref %s",
        getattr(updated, "count", 0),
        reference,
    )


async def _handle_payment_refunded(db: Prisma, data: dict[str, Any]) -> None:
    reference = data.get("reference")
    logger.info("Payment refunded: %s (ref: %s)", data.get("id"), reference)
    updated = await db.payment.update_many(
        where={"gatewayReference": reference, "status": "PAID"},
        data={"status": "REFUNDED"},
    )
    logger.info(
        "Marked %s payment(s) as REFUNDED for ref %s",
        getattr(updated, "count", 0),
        reference,
    )
