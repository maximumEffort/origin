"""Rental pricing with country/currency context."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from fastapi import HTTPException, status

ADD_ON_PRICES: dict[str, Decimal] = {
    "additional_driver": Decimal("150.00"),
    "cdw_waiver": Decimal("200.00"),
    "gps_tracker": Decimal("50.00"),
}


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _parse_date(value: str, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field} must be a valid ISO-8601 date",
        ) from exc


def _vehicle_monthly_rate(vehicle: Any) -> Decimal:
    value = getattr(vehicle, "monthlyRate", None)
    if value is None:
        value = getattr(vehicle, "monthlyRateAed", None)
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vehicle has no monthly rate configured",
        )
    return Decimal(str(value))


def _add_one_month(d: date) -> date:
    year = d.year + (1 if d.month == 12 else 0)
    month = 1 if d.month == 12 else d.month + 1
    last_day = (date(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1) - timedelta(days=1)).day
    return date(year, month, min(d.day, last_day))


async def quote_rental(
    db: Any,
    *,
    country: Any,
    vehicle_id: str,
    start_date: str,
    end_date: str,
    mileage_package: int,
    add_ons: dict[str, bool] | None = None,
) -> dict[str, Any]:
    vehicle = await db.vehicle.find_unique(where={"id": vehicle_id})
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if getattr(vehicle, "countryId", getattr(country, "id", None)) != country.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    vehicle_status = getattr(getattr(vehicle, "status", None), "value", getattr(vehicle, "status", None))
    if str(vehicle_status) != "AVAILABLE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle is not available for the selected dates",
        )

    start = _parse_date(start_date, "startDate")
    end = _parse_date(end_date, "endDate")
    if end <= start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="endDate must be after startDate")

    duration_days = (end - start).days
    duration_months = Decimal(duration_days) / Decimal("30")
    monthly = _vehicle_monthly_rate(vehicle)
    base_mileage = int(getattr(vehicle, "mileageLimitMonthly", 0) or 0)
    if mileage_package > base_mileage:
        monthly += Decimal(mileage_package - base_mileage) * Decimal("0.05")

    for key, enabled in (add_ons or {}).items():
        if enabled and key in ADD_ON_PRICES:
            monthly += ADD_ON_PRICES[key]

    if duration_days >= 365:
        monthly *= Decimal("0.92")
    elif duration_days >= 180:
        monthly *= Decimal("0.96")
    elif duration_days >= 90:
        monthly *= Decimal("0.98")

    subtotal = _money(monthly * duration_months)
    vat_rate = Decimal(str(country.vatRate))
    vat_amount = _money(subtotal * vat_rate)
    total = _money(subtotal + vat_amount)
    deposit = _money(monthly)
    currency_code = getattr(country, "defaultCurrencyCode", "AED")

    monthly_breakdown: list[dict[str, Any]] = []
    cursor = start
    iterations = int(duration_months) + (0 if duration_months == int(duration_months) else 1)
    for _ in range(iterations):
        base = _money(monthly)
        vat = _money(base * vat_rate)
        monthly_breakdown.append(
            {
                "month": cursor.strftime("%B %Y"),
                "amount": float(base),
                "vatAmount": float(vat),
                "total": float(_money(base + vat)),
                "currencyCode": currency_code,
            }
        )
        cursor = _add_one_month(cursor)

    return {
        "countryId": country.id,
        "currencyCode": currency_code,
        "durationDays": duration_days,
        "subtotal": float(subtotal),
        "vatRate": float(vat_rate),
        "vatAmount": float(vat_amount),
        "total": float(total),
        "deposit": float(deposit),
        "monthlyBreakdown": monthly_breakdown,
    }
