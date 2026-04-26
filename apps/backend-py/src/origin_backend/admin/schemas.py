"""
Pydantic schemas for the admin API.

Mirrors apps/backend/src/admin/dto/*. Response shapes are intentionally
loose (no strict response_model) — the admin dashboard reads many nested
relations and a strict schema would force re-shaping every Prisma include.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class RejectReasonRequest(BaseModel):
    reason: str | None = None

    model_config = ConfigDict(extra="forbid")


class CreateVehicleRequest(BaseModel):
    brand: str
    model: str
    year: int = Field(..., ge=2000)
    monthly_rate_aed: float = Field(..., alias="monthlyRateAed")
    daily_rate_aed: float | None = Field(default=None, alias="dailyRateAed")
    colour: str
    plate_number: str = Field(..., alias="plateNumber")
    mileage_limit_monthly: int = Field(..., alias="mileageLimitMonthly")
    seats: int
    category_id: str | None = Field(default=None, alias="categoryId")
    fuel_type: str | None = Field(default=None, alias="fuelType")
    transmission: str | None = None
    price_aed: float | None = Field(default=None, alias="priceAed")
    lease_monthly_aed: float | None = Field(default=None, alias="leaseMonthlyAed")
    notes: str | None = None
    insurance_expiry: str | None = Field(default=None, alias="insuranceExpiry")
    rta_registration_expiry: str | None = Field(default=None, alias="rtaRegistrationExpiry")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class UpdateVehicleRequest(BaseModel):
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    monthly_rate_aed: float | None = Field(default=None, alias="monthlyRateAed")
    daily_rate_aed: float | None = Field(default=None, alias="dailyRateAed")
    colour: str | None = None
    plate_number: str | None = Field(default=None, alias="plateNumber")
    mileage_limit_monthly: int | None = Field(default=None, alias="mileageLimitMonthly")
    seats: int | None = None
    fuel_type: str | None = Field(default=None, alias="fuelType")
    status: str | None = None
    price_aed: float | None = Field(default=None, alias="priceAed")
    lease_monthly_aed: float | None = Field(default=None, alias="leaseMonthlyAed")
    notes: str | None = None
    insurance_expiry: str | None = Field(default=None, alias="insuranceExpiry")
    rta_registration_expiry: str | None = Field(default=None, alias="rtaRegistrationExpiry")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class SetVehicleStatusRequest(BaseModel):
    status: str

    model_config = ConfigDict(extra="forbid")


class DashboardStats(BaseModel):
    totalCustomers: int
    pendingKyc: int
    pendingBookings: int
    activeLeases: int
    availableVehicles: int
    totalRevenueAed: float
