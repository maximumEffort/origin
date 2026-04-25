"""
Vehicles business logic.

Mirrors apps/backend/src/vehicles/vehicles.service.ts findAll / findOne.
Functions take Prisma as an explicit argument (DI via FastAPI Depends in
the router) so they're trivially testable with a mocked client.
"""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import HTTPException, status

from prisma import Prisma


def _enum_value(v: Any) -> str | None:
    """Prisma Python returns enums as Python enum members; coerce to str."""
    if v is None:
        return None
    return v.value if hasattr(v, "value") else str(v)


async def list_vehicles(
    db: Prisma,
    *,
    brand: str | None,
    category: str | None,
    fuel_type: str | None,
    min_price: float | None,
    max_price: float | None,
    page: int,
    limit: int,
) -> dict[str, object]:
    """List AVAILABLE vehicles with optional filters and pagination."""
    where: dict[str, Any] = {"status": "AVAILABLE"}

    if brand:
        where["brand"] = brand.upper()
    if fuel_type:
        where["fuelType"] = fuel_type.upper()

    price_filter: dict[str, float] = {}
    if min_price is not None:
        price_filter["gte"] = min_price
    if max_price is not None:
        price_filter["lte"] = max_price
    if price_filter:
        where["monthlyRateAed"] = price_filter

    if category:
        where["category"] = {"nameEn": {"contains": category, "mode": "insensitive"}}

    skip = (page - 1) * limit

    # Run list + count concurrently to halve round-trip latency when possible.
    vehicles, total = await asyncio.gather(
        db.vehicle.find_many(
            where=where,
            include={
                "category": True,
                "images": {"where": {"isPrimary": True}, "take": 1},
            },
            skip=skip,
            take=limit,
            order={"monthlyRateAed": "asc"},
        ),
        db.vehicle.count(where=where),
    )

    return {
        "data": [
            {
                "id": v.id,
                "brand": _enum_value(v.brand),
                "model": v.model,
                "year": v.year,
                "category": v.category,
                "fuelType": _enum_value(v.fuelType),
                "transmission": _enum_value(v.transmission),
                "colour": v.colour,
                "seats": v.seats,
                "monthlyRateAed": v.monthlyRateAed,
                "dailyRateAed": v.dailyRateAed,
                "mileageLimitMonthly": v.mileageLimitMonthly,
                "status": _enum_value(v.status),
                "notes": v.notes,
                "priceAed": v.priceAed,
                "leaseMonthlyAed": v.leaseMonthlyAed,
                "downPaymentPct": v.downPaymentPct,
                "primaryImageUrl": v.images[0].url if v.images else None,
            }
            for v in vehicles
        ],
        "pagination": {"page": page, "limit": limit, "total": total},
    }


async def get_vehicle(db: Prisma, vehicle_id: str) -> dict[str, object]:
    """Get one vehicle by ID, including its category and ordered images."""
    vehicle = await db.vehicle.find_unique(
        where={"id": vehicle_id},
        include={
            "category": True,
            "images": {"order_by": {"sortOrder": "asc"}},
        },
    )
    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {vehicle_id} not found",
        )

    return {
        "id": vehicle.id,
        "vin": vehicle.vin,
        "plateNumber": vehicle.plateNumber,
        "brand": _enum_value(vehicle.brand),
        "model": vehicle.model,
        "year": vehicle.year,
        "category": vehicle.category,
        "fuelType": _enum_value(vehicle.fuelType),
        "transmission": _enum_value(vehicle.transmission),
        "colour": vehicle.colour,
        "seats": vehicle.seats,
        "status": _enum_value(vehicle.status),
        "priceAed": vehicle.priceAed,
        "dailyRateAed": vehicle.dailyRateAed,
        "monthlyRateAed": vehicle.monthlyRateAed,
        "leaseMonthlyAed": vehicle.leaseMonthlyAed,
        "downPaymentPct": vehicle.downPaymentPct,
        "mileageLimitMonthly": vehicle.mileageLimitMonthly,
        "rtaRegistrationExpiry": vehicle.rtaRegistrationExpiry,
        "insuranceExpiry": vehicle.insuranceExpiry,
        "lastServiceDate": vehicle.lastServiceDate,
        "nextServiceDue": vehicle.nextServiceDue,
        "notes": vehicle.notes,
        "images": vehicle.images,
        "createdAt": vehicle.createdAt,
        "updatedAt": vehicle.updatedAt,
    }
