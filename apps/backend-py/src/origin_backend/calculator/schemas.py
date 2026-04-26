"""
Pydantic schemas for the calculator API.

Mirrors apps/backend/src/calculator/dto/quote.dto.ts and the response
shape returned by CalculatorService.getQuote in the NestJS backend.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class QuoteRequest(BaseModel):
    vehicle_id: str = Field(..., description="UUID of the vehicle to quote")
    start_date: str = Field(..., description="ISO date YYYY-MM-DD")
    end_date: str = Field(..., description="ISO date YYYY-MM-DD")
    mileage_package: int = Field(..., ge=1000, description="Monthly km package")
    add_ons: dict[str, bool] | None = Field(default=None)

    model_config = ConfigDict(extra="forbid")


class MonthlyBreakdown(BaseModel):
    month: str
    amount_aed: float
    vat_aed: float
    total_aed: float


class QuoteResponse(BaseModel):
    duration_days: int
    subtotal_aed: float
    vat_rate: float
    vat_amount_aed: float
    total_aed: float
    deposit_aed: float
    monthly_breakdown: list[MonthlyBreakdown]
