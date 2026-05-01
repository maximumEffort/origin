"""Pydantic wire schemas for the modular public API."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CountryBootstrapResponse(BaseModel):
    id: str
    code: str
    name: str
    defaultCurrencyCode: str
    vatRate: float
    productFlags: dict[str, bool]
    paymentGateways: list[str]
    kycDocumentTypes: list[dict[str, object]]


class RentalQuoteRequest(BaseModel):
    vehicle_id: str = Field(..., alias="vehicleId")
    start_date: str = Field(..., alias="startDate")
    end_date: str = Field(..., alias="endDate")
    mileage_package: int = Field(..., alias="mileagePackage", ge=1000)
    add_ons: dict[str, bool] | None = Field(default=None, alias="addOns")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class RentalBookingRequest(RentalQuoteRequest):
    pickup_location: str | None = Field(default=None, alias="pickupLocation")
    dropoff_location: str | None = Field(default=None, alias="dropoffLocation")
    notes: str | None = None

