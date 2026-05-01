"""Inventory platform service."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

BLOCKING_BOOKING_STATUSES = ["SUBMITTED", "APPROVED", "CONVERTED"]


def _enum_value(value: Any) -> str | None:
    if value is None:
        return None
    return value.value if hasattr(value, "value") else str(value)


async def get_available_vehicle(db: Any, *, country_id: str, vehicle_id: str) -> Any:
    vehicle = await db.vehicle.find_unique(where={"id": vehicle_id})
    if vehicle is None or getattr(vehicle, "countryId", country_id) != country_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if _enum_value(getattr(vehicle, "status", None)) != "AVAILABLE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle is not available for the selected dates",
        )
    return vehicle


async def assert_vehicle_available_for_dates(
    db: Any,
    *,
    country_id: str,
    vehicle_id: str,
    start: datetime,
    end: datetime,
    exclude_booking_id: str | None = None,
) -> None:
    where: dict[str, Any] = {
        "countryId": country_id,
        "vehicleId": vehicle_id,
        "status": {"in": BLOCKING_BOOKING_STATUSES},
        "AND": [{"startDate": {"lt": end}}, {"endDate": {"gt": start}}],
    }
    if exclude_booking_id:
        where["NOT"] = {"id": exclude_booking_id}
    overlap = await db.booking.find_first(where=where)
    if overlap is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle is already booked for those dates",
        )

