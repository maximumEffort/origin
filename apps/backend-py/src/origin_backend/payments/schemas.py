"""
Pydantic schemas for the payments API.

Mirrors apps/backend/src/payments/dto/create-payment-intent.dto.ts.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CreatePaymentIntentRequest(BaseModel):
    amount_aed: float = Field(..., alias="amountAed", ge=1, le=500_000)
    booking_ref: str | None = Field(default=None, alias="bookingRef", max_length=100)
    service_type: str | None = Field(default=None, alias="serviceType", max_length=50)
    vehicle_name: str | None = Field(default=None, alias="vehicleName", max_length=100)

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class PaymentIntentResponse(BaseModel):
    clientSecret: str
    paymentIntentId: str
