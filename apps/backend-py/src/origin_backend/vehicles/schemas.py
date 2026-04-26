"""
Pydantic schemas for the vehicles API.

Mirrors apps/backend/src/vehicles/dto/* and the response shapes returned
by VehiclesService.findAll / findOne in the NestJS backend.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class VehicleCategorySummary(BaseModel):
    id: str
    nameEn: str
    nameAr: str
    nameZh: str
    icon: str | None = None

    model_config = ConfigDict(from_attributes=True)


class VehicleImageSchema(BaseModel):
    id: str
    url: str
    isPrimary: bool
    sortOrder: int

    model_config = ConfigDict(from_attributes=True)


class VehicleSummary(BaseModel):
    """Shape returned by GET /vehicles list items."""

    id: str
    brand: str
    model: str
    year: int
    category: VehicleCategorySummary
    fuelType: str
    transmission: str
    colour: str
    seats: int
    monthlyRateAed: Decimal
    dailyRateAed: Decimal
    mileageLimitMonthly: int
    status: str
    notes: str | None = None
    priceAed: Decimal | None = None
    leaseMonthlyAed: Decimal | None = None
    downPaymentPct: Decimal
    primaryImageUrl: str | None = None


class VehicleDetail(BaseModel):
    """Full vehicle record returned by GET /vehicles/:id."""

    id: str
    vin: str
    plateNumber: str
    brand: str
    model: str
    year: int
    category: VehicleCategorySummary
    fuelType: str
    transmission: str
    colour: str
    seats: int
    status: str
    priceAed: Decimal | None = None
    dailyRateAed: Decimal
    monthlyRateAed: Decimal
    leaseMonthlyAed: Decimal | None = None
    downPaymentPct: Decimal
    mileageLimitMonthly: int
    rtaRegistrationExpiry: datetime | None = None
    insuranceExpiry: datetime | None = None
    lastServiceDate: datetime | None = None
    nextServiceDue: datetime | None = None
    notes: str | None = None
    images: list[VehicleImageSchema]
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class Pagination(BaseModel):
    page: int
    limit: int
    total: int


class PaginatedVehicles(BaseModel):
    data: list[VehicleSummary]
    pagination: Pagination
