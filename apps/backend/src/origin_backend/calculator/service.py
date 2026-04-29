"""
Calculator business logic.

Mirrors apps/backend/src/calculator/calculator.service.ts. Behaviour is a
direct port — same monthly-rate maths, same add-on prices, same long-term
discount thresholds — so quotes from the Python and Node services are
indistinguishable to the customer.
"""

from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException, status

from prisma import Prisma

VAT_RATE = float(os.environ.get("VAT_RATE", "0.05"))

ADD_ON_PRICES: dict[str, float] = {
    "additional_driver": 150.0,
    "cdw_waiver": 200.0,
    "gps_tracker": 50.0,
}


def _round2(n: float) -> float:
    return round(n * 100) / 100


def _parse_iso_date(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field} must be a valid ISO-8601 date (YYYY-MM-DD)",
        ) from e


def _format_month(d: date) -> str:
    """Match the JS `toLocaleString('en-US', {month: 'long', year: 'numeric'})`."""
    return d.strftime("%B %Y")


def _add_one_month(d: date) -> date:
    """Increment by exactly one month. Mirrors JS `setMonth(getMonth() + 1)`
    which clamps end-of-month overflows to the next month's last day."""
    year = d.year + (1 if d.month == 12 else 0)
    month = 1 if d.month == 12 else d.month + 1
    # JS Date setMonth clamps day to last of target month
    last_day = (date(year, month + 1, 1) - timedelta(days=1)).day if month < 12 else 31
    day = min(d.day, last_day)
    return date(year, month, day)


async def get_quote(
    db: Prisma,
    *,
    vehicle_id: str,
    start_date: str,
    end_date: str,
    mileage_package: int,
    add_ons: dict[str, bool] | None,
) -> dict[str, Any]:
    """Compute a lease quote for the given vehicle + dates."""
    vehicle = await db.vehicle.find_unique(where={"id": vehicle_id})
    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # Don't quote (and therefore don't book) on a vehicle that's leased,
    # in maintenance, or retired. See #132.
    vehicle_status = (
        vehicle.status.value if hasattr(vehicle.status, "value") else str(vehicle.status)
    )
    if vehicle_status != "AVAILABLE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle is not available for the selected dates",
        )

    start = _parse_iso_date(start_date, "start_date")
    end = _parse_iso_date(end_date, "end_date")
    if end <= start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_date must be after start_date",
        )

    # Match JS Math.ceil((end - start) / ms_per_day). Pure date subtraction
    # already yields whole days, but the ceil is preserved for parity if a
    # caller ever passes ISO datetimes.
    duration_days = (end - start).days
    duration_months = duration_days / 30

    monthly = float(vehicle.monthlyRateAed)

    # Mileage surcharge above vehicle base limit
    if mileage_package > vehicle.mileageLimitMonthly:
        monthly += (mileage_package - vehicle.mileageLimitMonthly) * 0.05

    # Add-ons
    add_ons_monthly = 0.0
    for key, enabled in (add_ons or {}).items():
        if enabled and key in ADD_ON_PRICES:
            add_ons_monthly += ADD_ON_PRICES[key]
    monthly += add_ons_monthly

    # Long-term discounts
    if duration_days >= 365:
        monthly *= 0.92
    elif duration_days >= 180:
        monthly *= 0.96
    elif duration_days >= 90:
        monthly *= 0.98

    subtotal = _round2(monthly * duration_months)
    vat = _round2(subtotal * VAT_RATE)
    total = _round2(subtotal + vat)
    deposit = _round2(monthly)

    # Monthly breakdown — full monthly amount per row, even on partial months.
    # Mirrors `Math.ceil(durationMonths)` from the Node service.
    monthly_breakdown: list[dict[str, Any]] = []
    cursor = start
    iterations = int(duration_months) + (0 if duration_months.is_integer() else 1)
    for _ in range(iterations):
        base = _round2(monthly)
        vat_amt = _round2(base * VAT_RATE)
        monthly_breakdown.append(
            {
                "month": _format_month(cursor),
                "amount_aed": base,
                "vat_aed": vat_amt,
                "total_aed": _round2(base + vat_amt),
            }
        )
        cursor = _add_one_month(cursor)

    return {
        "duration_days": duration_days,
        "subtotal_aed": subtotal,
        "vat_rate": VAT_RATE,
        "vat_amount_aed": vat,
        "total_aed": total,
        "deposit_aed": deposit,
        "monthly_breakdown": monthly_breakdown,
    }
