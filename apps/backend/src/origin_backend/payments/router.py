"""
Payments endpoint — mirrors apps/backend/src/payments/payments.controller.ts:

    POST /payments/create-intent   Create a Stripe PaymentIntent (auth required)

NOTE: The Node service has no Stripe webhook handler today — it only
provisions PaymentIntents. The webhook lives behind a TODO until the
booking/lease confirmation flow needs it.
"""

from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status

from origin_backend.calculator.service import VAT_RATE
from origin_backend.common.auth import AuthenticatedUser, require_user
from origin_backend.common.prisma import get_db
from origin_backend.integrations import stripe_payments
from origin_backend.payments.schemas import (
    CreatePaymentIntentRequest,
    PaymentIntentResponse,
)
from prisma import Prisma

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-intent", response_model=PaymentIntentResponse)
async def create_payment_intent_endpoint(
    body: CreatePaymentIntentRequest,
    user: AuthenticatedUser = Depends(require_user),
    db: Prisma = Depends(get_db),
) -> object:
    """
    Create a Stripe PaymentIntent for the deposit on a customer-owned booking.

    The amount is derived server-side from the booking row — never from the
    client — so a customer cannot tamper with the Stripe charge (#128).
    """
    booking = await db.booking.find_unique(
        where={"id": body.booking_id},
        include={"vehicle": True},
    )
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.customerId != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if booking.depositPaid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deposit has already been paid for this booking",
        )

    # Charge the deposit (one month) plus VAT. depositAmountAed is stored
    # pre-VAT to match the calculator's quote shape — see #129 for the
    # corresponding frontend fix that stops charging the full lease total.
    charge_amount = Decimal(str(booking.depositAmountAed)) * (Decimal("1") + Decimal(str(VAT_RATE)))
    charge_amount_aed = float(charge_amount.quantize(Decimal("0.01")))

    metadata: dict[str, str] = {
        "bookingId": booking.id,
        "bookingRef": booking.reference,
        "customerId": booking.customerId,
    }
    vehicle = getattr(booking, "vehicle", None)
    if vehicle is not None:
        metadata["vehicleName"] = f"{vehicle.brand} {vehicle.model}".strip()

    try:
        return await stripe_payments.create_payment_intent(charge_amount_aed, metadata)
    except RuntimeError as e:
        # Stripe not configured in this environment.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not configured.",
        ) from e
