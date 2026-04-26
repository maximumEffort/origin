"""
Bookings endpoints — mirrors apps/backend/src/bookings/bookings.controller.ts:

    POST /bookings              Create a draft booking
    POST /bookings/:id/submit   Submit a draft for review
    GET  /bookings              List the customer's bookings
    GET  /bookings/:id          Booking detail (own bookings only)

All endpoints require a customer access token.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from origin_backend.bookings import service
from origin_backend.bookings.schemas import BookingResponse, CreateBookingRequest
from origin_backend.common.auth import AuthenticatedUser, require_customer
from origin_backend.common.prisma import get_db
from prisma import Prisma

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking_endpoint(
    body: CreateBookingRequest,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """Create a draft booking, priced via the calculator."""
    return await service.create(
        db,
        user.id,
        vehicle_id=body.vehicle_id,
        start_date=body.start_date,
        end_date=body.end_date,
        mileage_package=body.mileage_package,
        add_ons=body.add_ons,
        pickup_location=body.pickup_location,
        dropoff_location=body.dropoff_location,
        notes=body.notes,
    )


@router.post("/{booking_id}/submit", response_model=BookingResponse)
async def submit_booking_endpoint(
    booking_id: str,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """Move a draft booking to SUBMITTED."""
    return await service.submit(db, user.id, booking_id)


@router.get("", response_model=list[BookingResponse])
async def list_bookings_endpoint(
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """List the authenticated customer's bookings (newest first)."""
    return await service.find_by_customer(db, user.id)


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking_endpoint(
    booking_id: str,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """Get a single booking. 403 if it belongs to another customer."""
    return await service.find_one(db, user.id, booking_id)
