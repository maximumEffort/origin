"""
Vehicles endpoints - mirrors apps/backend/src/vehicles/vehicles.controller.ts:

    GET /vehicles      List vehicles with optional filters
    GET /vehicles/:id  Full vehicle detail by ID
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from origin_backend.common.prisma import get_db
from origin_backend.vehicles import service
from origin_backend.vehicles.schemas import PaginatedVehicles, VehicleDetail
from prisma import Prisma

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=PaginatedVehicles)
async def list_vehicles_endpoint(
    brand: str | None = Query(None, description="Brand name (e.g. BYD)"),
    category: str | None = Query(None, description="Category name (case-insensitive)"),
    fuel_type: str | None = Query(None, description="electric | hybrid | petrol | diesel"),
    min_price: float | None = Query(None, ge=0, description="Min monthly rate (AED)"),
    max_price: float | None = Query(None, ge=0, description="Max monthly rate (AED)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Prisma = Depends(get_db),
) -> dict[str, object]:
    """List available vehicles with optional filters and pagination."""
    return await service.list_vehicles(
        db,
        brand=brand,
        category=category,
        fuel_type=fuel_type,
        min_price=min_price,
        max_price=max_price,
        page=page,
        limit=limit,
    )


@router.get("/{vehicle_id}", response_model=VehicleDetail)
async def get_vehicle_endpoint(
    vehicle_id: str,
    db: Prisma = Depends(get_db),
) -> dict[str, object]:
    """Get one vehicle by ID, with category and ordered images."""
    return await service.get_vehicle(db, vehicle_id)
