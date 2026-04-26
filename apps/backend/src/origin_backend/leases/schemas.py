"""
Pydantic schemas for the leases API.

Mirrors apps/backend/src/leases/dto/* and the response shapes returned by
LeasesService in the NestJS backend.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RenewLeaseRequest(BaseModel):
    new_end_date: str = Field(..., description="ISO date YYYY-MM-DD")
    mileage_package: int | None = Field(default=None, ge=1000)

    model_config = ConfigDict(extra="forbid")


class VehicleStubInLease(BaseModel):
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    plateNumber: str | None = None


class PaymentInLease(BaseModel):
    id: str
    leaseId: str | None = None
    type: str
    status: str
    amountAed: Decimal
    dueDate: datetime | None = None
    paidAt: datetime | None = None


class BookingStubInLease(BaseModel):
    reference: str | None = None
    pickupLocation: str | None = None


class LeaseResponse(BaseModel):
    id: str
    reference: str
    bookingId: str
    customerId: str
    vehicleId: str
    startDate: datetime
    endDate: datetime
    serviceType: str
    monthlyRateAed: Decimal
    vatRate: Decimal
    mileageLimitMonthly: int
    downPaymentAed: Decimal | None = None
    status: str
    renewalOfId: str | None = None
    agreementPdfUrl: str | None = None
    notes: str | None = None
    vehicle: VehicleStubInLease | dict[str, Any] | None = None
    payments: list[PaymentInLease] = []
    booking: BookingStubInLease | None = None
    createdAt: datetime
    updatedAt: datetime
