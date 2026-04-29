"""
Pydantic schemas for the payments API.

The request shape was tightened in #128: the customer no longer sends an
amount or a free-text booking reference — they identify the booking by
its UUID and the server derives the chargeable amount from the booking
row. This closes a direct financial-loss vector where the client could
have paid 1 AED on a 100,000 AED booking.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CreatePaymentIntentRequest(BaseModel):
    booking_id: str = Field(..., alias="bookingId", min_length=1, max_length=64)

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class PaymentIntentResponse(BaseModel):
    clientSecret: str
    paymentIntentId: str
