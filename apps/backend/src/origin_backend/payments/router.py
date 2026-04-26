"""
Payments endpoint — mirrors apps/backend/src/payments/payments.controller.ts:

    POST /payments/create-intent   Create a Stripe PaymentIntent (auth required)

NOTE: The Node service has no Stripe webhook handler today — it only
provisions PaymentIntents. The webhook lives behind a TODO until the
booking/lease confirmation flow needs it.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from origin_backend.common.auth import AuthenticatedUser, require_user
from origin_backend.integrations import stripe_payments
from origin_backend.payments.schemas import (
    CreatePaymentIntentRequest,
    PaymentIntentResponse,
)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-intent", response_model=PaymentIntentResponse)
async def create_payment_intent_endpoint(
    body: CreatePaymentIntentRequest,
    _: AuthenticatedUser = Depends(require_user),
) -> object:
    """Create a Stripe PaymentIntent for a deposit / reservation."""
    metadata: dict[str, str] = {}
    if body.booking_ref:
        metadata["bookingRef"] = body.booking_ref
    if body.service_type:
        metadata["serviceType"] = body.service_type
    if body.vehicle_name:
        metadata["vehicleName"] = body.vehicle_name

    try:
        return await stripe_payments.create_payment_intent(body.amount_aed, metadata)
    except RuntimeError as e:
        # Stripe not configured in this environment.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not configured.",
        ) from e
