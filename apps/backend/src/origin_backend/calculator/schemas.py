"""
Pydantic schemas for the calculator API.

Audit ref: #138 §1 — calculator was the only module exposing snake_case
on the wire. Aligned to camelCase via Field aliases here so every API
endpoint speaks the same wire format. `populate_by_name=True` keeps
the Python-side identifiers snake_case while accepting either form on
input and emitting camelCase on output.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class QuoteRequest(BaseModel):
    vehicle_id: str = Field(..., alias="vehicleId", description="UUID of the vehicle to quote")
    start_date: str = Field(..., alias="startDate", description="ISO date YYYY-MM-DD")
    end_date: str = Field(..., alias="endDate", description="ISO date YYYY-MM-DD")
    mileage_package: int = Field(
        ..., alias="mileagePackage", ge=1000, description="Monthly km package"
    )
    add_ons: dict[str, bool] | None = Field(default=None, alias="addOns")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class MonthlyBreakdown(BaseModel):
    month: str
    amount_aed: float = Field(..., alias="amountAed")
    vat_aed: float = Field(..., alias="vatAed")
    total_aed: float = Field(..., alias="totalAed")

    model_config = ConfigDict(populate_by_name=True)


class QuoteResponse(BaseModel):
    duration_days: int = Field(..., alias="durationDays")
    subtotal_aed: float = Field(..., alias="subtotalAed")
    vat_rate: float = Field(..., alias="vatRate")
    vat_amount_aed: float = Field(..., alias="vatAmountAed")
    total_aed: float = Field(..., alias="totalAed")
    deposit_aed: float = Field(..., alias="depositAed")
    monthly_breakdown: list[MonthlyBreakdown] = Field(..., alias="monthlyBreakdown")

    model_config = ConfigDict(populate_by_name=True)
