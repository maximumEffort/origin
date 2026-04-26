"""
Bookings business logic.

Mirrors apps/backend/src/bookings/bookings.service.ts. Booking creation
calls the calculator to derive duration + totals, then persists a DRAFT
booking. Customers can submit a draft (DRAFT → SUBMITTED) or list/read
their own bookings.

The Node service fires a non-blocking SendGrid confirmation email on
create. That side-effect is deferred until the SendGrid integration is
ported (see apps/backend-py/README.md migration checklist).
"""

from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from origin_backend.calculator import service as calculator_service
from origin_backend.integrations import sendgrid_email
from prisma import Prisma

logger = logging.getLogger(__name__)


def _enum_value(v: Any) -> str | None:
    if v is None:
        return None
    return v.value if hasattr(v, "value") else str(v)


def _generate_reference() -> str:
    """`BK-<year>-<8-hex>` — matches the Node generator format."""
    year = datetime.now(UTC).year
    seq = secrets.token_hex(4).upper()
    return f"BK-{year}-{seq}"


def _serialise_booking(booking: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": booking.id,
        "reference": booking.reference,
        "customerId": booking.customerId,
        "vehicleId": booking.vehicleId,
        "leaseType": _enum_value(booking.leaseType),
        "serviceType": _enum_value(booking.serviceType),
        "startDate": booking.startDate,
        "endDate": booking.endDate,
        "durationDays": booking.durationDays,
        "mileagePackage": booking.mileagePackage,
        "addOns": booking.addOns or {},
        "quotedTotalAed": booking.quotedTotalAed,
        "vatAmountAed": booking.vatAmountAed,
        "grandTotalAed": booking.grandTotalAed,
        "depositAmountAed": booking.depositAmountAed,
        "depositPaid": booking.depositPaid,
        "status": _enum_value(booking.status),
        "rejectionReason": booking.rejectionReason,
        "pickupLocation": booking.pickupLocation,
        "dropoffLocation": booking.dropoffLocation,
        "notes": booking.notes,
        "createdAt": booking.createdAt,
        "updatedAt": booking.updatedAt,
    }
    vehicle = getattr(booking, "vehicle", None)
    if vehicle is not None:
        base["vehicle"] = {
            "brand": _enum_value(vehicle.brand),
            "model": vehicle.model,
            "year": vehicle.year,
        }
    return base


async def create(
    db: Prisma,
    customer_id: str,
    *,
    vehicle_id: str,
    start_date: str,
    end_date: str,
    mileage_package: int,
    add_ons: dict[str, bool] | None,
    pickup_location: str | None,
    dropoff_location: str | None,
    notes: str | None,
) -> dict[str, Any]:
    """Create a DRAFT booking after pricing it via the calculator."""
    quote = await calculator_service.get_quote(
        db,
        vehicle_id=vehicle_id,
        start_date=start_date,
        end_date=end_date,
        mileage_package=mileage_package,
        add_ons=add_ons,
    )

    duration_days: int = quote["duration_days"]
    lease_type = "SHORT_TERM" if duration_days < 30 else "LONG_TERM"

    data: dict[str, Any] = {
        "reference": _generate_reference(),
        "customerId": customer_id,
        "vehicleId": vehicle_id,
        "leaseType": lease_type,
        "startDate": datetime.fromisoformat(start_date),
        "endDate": datetime.fromisoformat(end_date),
        "durationDays": duration_days,
        "mileagePackage": mileage_package,
        "addOns": add_ons or {},
        "quotedTotalAed": quote["subtotal_aed"],
        "vatAmountAed": quote["vat_amount_aed"],
        "grandTotalAed": quote["total_aed"],
        "depositAmountAed": quote["deposit_aed"],
        "pickupLocation": pickup_location,
        "dropoffLocation": dropoff_location,
        "notes": notes,
        "status": "DRAFT",
    }

    booking = await db.booking.create(data=data)

    # Best-effort booking confirmation email. Failures are swallowed
    # inside sendgrid_email so a mail outage can't kill a booking.
    customer = await db.customer.find_unique(where={"id": customer_id})
    if customer is not None and customer.email:
        lang = _enum_value(customer.preferredLanguage) or "en"
        await sendgrid_email.send_booking_confirmation(
            customer.email,
            {
                "bookingRef": booking.reference,
                "customerName": customer.fullName,
                "startDate": booking.startDate.date().isoformat(),
                "endDate": booking.endDate.date().isoformat(),
                "totalAed": str(booking.grandTotalAed),
                "depositAed": str(booking.depositAmountAed),
            },
            lang,  # type: ignore[arg-type]
        )

    return _serialise_booking(booking)


async def submit(db: Prisma, customer_id: str, booking_id: str) -> dict[str, Any]:
    """Move a DRAFT booking to SUBMITTED for back-office review."""
    booking = await db.booking.find_unique(where={"id": booking_id})
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.customerId != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if _enum_value(booking.status) != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft bookings can be submitted",
        )

    updated = await db.booking.update(
        where={"id": booking_id},
        data={"status": "SUBMITTED"},
    )
    return _serialise_booking(updated)


async def find_by_customer(db: Prisma, customer_id: str) -> list[dict[str, Any]]:
    """List all bookings for a customer, newest first, with vehicle stub."""
    bookings = await db.booking.find_many(
        where={"customerId": customer_id},
        include={"vehicle": {"select": {"brand": True, "model": True, "year": True}}},
        order={"createdAt": "desc"},
    )
    return [_serialise_booking(b) for b in bookings]


async def find_one(db: Prisma, customer_id: str, booking_id: str) -> dict[str, Any]:
    """Get a single booking. 404 if missing, 403 if it belongs to someone else."""
    booking = await db.booking.find_unique(
        where={"id": booking_id},
        include={"vehicle": True},
    )
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.customerId != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return _serialise_booking(booking)
