"""
Pydantic schemas for the bookings API.

Mirrors apps/backend/src/bookings/dto/* and the response shapes returned
by BookingsService in the NestJS backend.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CreateBookingRequest(BaseModel):
    vehicle_id: str
    start_date: str = Field(..., description="ISO date YYYY-MM-DD")
    end_date: str = Field(..., description="ISO date YYYY-MM-DD")
    mileage_package: int = Field(..., ge=1000)
    add_ons: dict[str, bool] | None = None
    pickup_location: str | None = None
    dropoff_location: str | None = None
    notes: str | None = Field(default=None, max_length=2000)

    model_config = ConfigDict(extra="forbid")


class VehicleSummaryForBooking(BaseModel):
    brand: str
    model: str
    year: int


class BookingResponse(BaseModel):
    id: str
    reference: str
    customerId: str
    vehicleId: str | None = None
    leaseType: str
    serviceType: str
    startDate: datetime
    endDate: datetime
    durationDays: int
    mileagePackage: int
    addOns: dict[str, Any]
    quotedTotalAed: Decimal
    vatAmountAed: Decimal
    grandTotalAed: Decimal
    depositAmountAed: Decimal
    depositPaid: bool
    status: str
    rejectionReason: str | None = None
    pickupLocation: str | None = None
    dropoffLocation: str | None = None
    notes: str | None = None
    vehicle: VehicleSummaryForBooking | None = None
    createdAt: datetime
    updatedAt: datetime
