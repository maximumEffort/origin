"""Rental booking and lease workflow service."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from origin_backend.core.messaging.outbox import OutboxMessage, enqueue, event_payload
from origin_backend.platform.identity.service import require_customer_kyc_approved
from origin_backend.platform.inventory.service import assert_vehicle_available_for_dates
from origin_backend.platform.pricing.service import quote_rental
from origin_backend.products.rental import events


def _enum_value(value: Any) -> str | None:
    if value is None:
        return None
    return value.value if hasattr(value, "value") else str(value)


def _booking_reference() -> str:
    return f"BK-{datetime.now(UTC).year}-{secrets.token_hex(4).upper()}"


async def create_draft_booking(
    db: Any,
    *,
    country: Any,
    customer_id: str,
    vehicle_id: str,
    start_date: str,
    end_date: str,
    mileage_package: int,
    add_ons: dict[str, bool] | None = None,
    pickup_location: str | None = None,
    dropoff_location: str | None = None,
    notes: str | None = None,
) -> Any:
    await require_customer_kyc_approved(db, customer_id=customer_id, country_id=country.id)
    quote = await quote_rental(
        db,
        country=country,
        vehicle_id=vehicle_id,
        start_date=start_date,
        end_date=end_date,
        mileage_package=mileage_package,
        add_ons=add_ons,
    )
    start_dt = datetime.fromisoformat(start_date)
    end_dt = datetime.fromisoformat(end_date)
    await assert_vehicle_available_for_dates(
        db,
        country_id=country.id,
        vehicle_id=vehicle_id,
        start=start_dt,
        end=end_dt,
    )

    lease_type = "SHORT_TERM" if quote["durationDays"] < 30 else "LONG_TERM"
    return await db.booking.create(
        data={
            "countryId": country.id,
            "currencyCode": quote["currencyCode"],
            "reference": _booking_reference(),
            "customerId": customer_id,
            "vehicleId": vehicle_id,
            "leaseType": lease_type,
            "serviceType": "RENT",
            "startDate": start_dt,
            "endDate": end_dt,
            "durationDays": quote["durationDays"],
            "mileagePackage": mileage_package,
            "addOns": add_ons or {},
            "quotedTotal": quote["subtotal"],
            "vatAmount": quote["vatAmount"],
            "grandTotal": quote["total"],
            "depositAmount": quote["deposit"],
            "pickupLocation": pickup_location,
            "dropoffLocation": dropoff_location,
            "notes": notes,
            "status": "DRAFT",
        }
    )


async def submit_booking(db: Any, *, country_id: str, customer_id: str, booking_id: str) -> Any:
    booking = await db.booking.find_unique(where={"id": booking_id}, include={"vehicle": True})
    if booking is None or getattr(booking, "countryId", country_id) != country_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.customerId != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if _enum_value(booking.status) != "DRAFT":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft bookings can be submitted")

    await require_customer_kyc_approved(db, customer_id=customer_id, country_id=country_id)
    await assert_vehicle_available_for_dates(
        db,
        country_id=country_id,
        vehicle_id=booking.vehicleId,
        start=booking.startDate,
        end=booking.endDate,
        exclude_booking_id=booking.id,
    )
    updated = await db.booking.update(where={"id": booking_id}, data={"status": "SUBMITTED"})
    await enqueue(
        db,
        OutboxMessage(
            event_type=events.BOOKING_SUBMITTED,
            aggregate_type="Booking",
            aggregate_id=booking_id,
            country_id=country_id,
            payload=event_payload(
                countryId=country_id,
                bookingId=booking_id,
                customerId=customer_id,
                vehicleId=booking.vehicleId,
                currencyCode=getattr(booking, "currencyCode", "AED"),
            ),
        ),
    )
    return updated

