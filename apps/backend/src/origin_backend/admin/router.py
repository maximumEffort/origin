"""
Admin endpoints — mirrors apps/backend/src/admin/admin.controller.ts.

All routes require an admin JWT. Per-route role gating mirrors the
NestJS @Roles(...) matrix:

    SUPER_ADMIN   — full access
    SALES         — bookings + customers + KYC
    FLEET_MANAGER — vehicles only
    FINANCE       — dashboard stats + bookings + leases (read-only)
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, status
from fastapi.encoders import jsonable_encoder

from origin_backend.admin import service
from origin_backend.admin.schemas import (
    CreateVehicleRequest,
    DashboardStats,
    RejectReasonRequest,
    SetVehicleStatusRequest,
    UpdateVehicleRequest,
)
from origin_backend.common.auth import AuthenticatedUser, require_admin
from origin_backend.common.prisma import get_db
from origin_backend.common.request_context import RequestInfo, get_request_info
from prisma import Prisma

router = APIRouter(prefix="/admin", tags=["admin"])


def _encode(value: Any) -> Any:
    """
    Coerce Prisma objects (which are Pydantic models in production) into
    JSON-safe structures. Admin endpoints return wide nested relations
    and writing a Pydantic response_model for every shape would be more
    code than signal — let FastAPI's encoder handle the dirty work.

    We also unwrap any object that doesn't have a `.model_dump` (e.g. the
    SimpleNamespace fakes used in the test suite) by reading its `__dict__`,
    so the encoder doesn't trip over them.
    """
    if hasattr(value, "model_dump"):
        return jsonable_encoder(value)
    if hasattr(value, "__dict__") and not isinstance(value, type):
        return jsonable_encoder({k: _encode(v) for k, v in vars(value).items()})
    if isinstance(value, list):
        return [_encode(v) for v in value]
    if isinstance(value, dict):
        return {k: _encode(v) for k, v in value.items()}
    return jsonable_encoder(value)


# ── Dashboard ─────────────────────────────────────────────────────────────


@router.get("/stats", response_model=DashboardStats)
async def get_stats_endpoint(
    _=Depends(require_admin("SUPER_ADMIN", "SALES", "FLEET_MANAGER", "FINANCE")),
    db: Prisma = Depends(get_db),
) -> object:
    """Dashboard KPIs: pending bookings, KYC queue, fleet status, revenue."""
    return _encode(await service.get_dashboard_stats(db))


# ── Bookings ──────────────────────────────────────────────────────────────


@router.get("/bookings")
async def list_bookings_endpoint(
    status_filter: str | None = Query(None, alias="status"),
    _=Depends(require_admin("SUPER_ADMIN", "SALES", "FINANCE")),
    db: Prisma = Depends(get_db),
) -> object:
    """List all bookings (admin view with customer + vehicle details)."""
    return _encode(await service.list_all_bookings(db, status_filter))


@router.post("/bookings/{booking_id}/approve", status_code=status.HTTP_200_OK)
async def approve_booking_endpoint(
    booking_id: str,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Approve a SUBMITTED booking."""
    return _encode(
        await service.approve_booking(
            db,
            booking_id,
            admin_id=user.id,
            ip_address=req_info.ip_address,
            user_agent=req_info.user_agent,
        )
    )


@router.post("/bookings/{booking_id}/reject", status_code=status.HTTP_200_OK)
async def reject_booking_endpoint(
    booking_id: str,
    body: RejectReasonRequest,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Reject a SUBMITTED booking with optional reason."""
    return _encode(
        await service.reject_booking(
            db,
            booking_id,
            body.reason,
            admin_id=user.id,
            ip_address=req_info.ip_address,
            user_agent=req_info.user_agent,
        )
    )


@router.post("/bookings/{booking_id}/create-lease", status_code=status.HTTP_201_CREATED)
async def create_lease_endpoint(
    booking_id: str,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Convert an APPROVED booking into an active lease + payment schedule."""
    return _encode(
        await service.create_lease_from_booking(
            db,
            booking_id,
            admin_id=user.id,
            ip_address=req_info.ip_address,
            user_agent=req_info.user_agent,
        )
    )


# ── Customers & KYC ───────────────────────────────────────────────────────


@router.get("/customers")
async def list_customers_endpoint(
    kyc_status: str | None = Query(None, alias="kycStatus"),
    _=Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
) -> object:
    """List customers with KYC status + document summary."""
    return _encode(await service.list_all_customers(db, kyc_status))


@router.get("/customers/{customer_id}")
async def get_customer_endpoint(
    customer_id: str,
    _=Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
) -> object:
    """Full customer profile with documents, bookings, leases."""
    return _encode(await service.get_customer(db, customer_id))


@router.post("/customers/{customer_id}/kyc/approve", status_code=status.HTTP_200_OK)
async def approve_kyc_endpoint(
    customer_id: str,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Approve a SUBMITTED KYC application."""
    return _encode(
        await service.approve_kyc(
            db,
            customer_id,
            admin_id=user.id,
            ip_address=req_info.ip_address,
            user_agent=req_info.user_agent,
        )
    )


@router.post("/customers/{customer_id}/kyc/reject", status_code=status.HTTP_200_OK)
async def reject_kyc_endpoint(
    customer_id: str,
    body: RejectReasonRequest,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Reject a customer's KYC submission with optional reason."""
    return _encode(
        await service.reject_kyc(
            db,
            customer_id,
            body.reason,
            admin_id=user.id,
            ip_address=req_info.ip_address,
            user_agent=req_info.user_agent,
        )
    )


# ── Leases ────────────────────────────────────────────────────────────────


@router.get("/leases")
async def list_leases_endpoint(
    status_filter: str | None = Query(None, alias="status"),
    _=Depends(require_admin("SUPER_ADMIN", "SALES", "FINANCE")),
    db: Prisma = Depends(get_db),
) -> object:
    """List leases with customer, vehicle, and payment details."""
    return _encode(await service.list_all_leases(db, status_filter))


# ── Fleet / Vehicles ──────────────────────────────────────────────────────


@router.get("/vehicles")
async def list_vehicles_endpoint(
    status_filter: str | None = Query(None, alias="status"),
    _=Depends(require_admin("SUPER_ADMIN", "FLEET_MANAGER", "SALES", "FINANCE")),
    db: Prisma = Depends(get_db),
) -> object:
    """Admin view of vehicles with primary image + booking/lease counts."""
    return _encode(await service.list_all_vehicles(db, status_filter))


@router.post("/vehicles", status_code=status.HTTP_201_CREATED)
async def create_vehicle_endpoint(
    body: CreateVehicleRequest,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "FLEET_MANAGER")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Add a new vehicle to the fleet (auto-VIN, auto-category if missing)."""
    return _encode(
        await service.create_vehicle(
            db,
            body,
            admin_id=user.id,
            ip_address=req_info.ip_address,
            user_agent=req_info.user_agent,
        )
    )


@router.patch("/vehicles/{vehicle_id}")
async def update_vehicle_endpoint(
    vehicle_id: str,
    body: UpdateVehicleRequest,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "FLEET_MANAGER")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Partial update of a vehicle."""
    return _encode(
        await service.update_vehicle(
            db,
            vehicle_id,
            body,
            admin_id=user.id,
            ip_address=req_info.ip_address,
            user_agent=req_info.user_agent,
        )
    )


@router.post("/vehicles/{vehicle_id}/status", status_code=status.HTTP_200_OK)
async def set_vehicle_status_endpoint(
    vehicle_id: str,
    body: SetVehicleStatusRequest,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "FLEET_MANAGER")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Set vehicle status (AVAILABLE / LEASED / MAINTENANCE / RETIRED)."""
    return _encode(
        await service.set_vehicle_status(
            db,
            vehicle_id,
            body.status,
            admin_id=user.id,
            ip_address=req_info.ip_address,
            user_agent=req_info.user_agent,
        )
    )
