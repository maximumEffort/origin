"""
Leases business logic.

Mirrors apps/backend/src/leases/leases.service.ts. Customers can list
their leases, fetch one (with payments + booking stub), or renew an
ACTIVE lease — which marks the original as RENEWED and creates a new
ACTIVE lease starting at the old end date.

Admin-callable transitions:
- complete(): mark an ACTIVE lease COMPLETED and free its vehicle.
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from origin_backend.common.audit import log_action
from prisma import Prisma


def _enum_value(v: Any) -> str | None:
    if v is None:
        return None
    return v.value if hasattr(v, "value") else str(v)


def _parse_iso_date(value: str, field: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field} must be a valid ISO-8601 date",
        ) from e


def _serialise_payment(payment: Any) -> dict[str, Any]:
    return {
        "id": payment.id,
        "leaseId": getattr(payment, "leaseId", None),
        "type": _enum_value(payment.type),
        "status": _enum_value(payment.status),
        "amountAed": payment.amountAed,
        "dueDate": getattr(payment, "dueDate", None),
        "paidAt": getattr(payment, "paidAt", None),
    }


def _serialise_lease(lease: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": lease.id,
        "reference": lease.reference,
        "bookingId": lease.bookingId,
        "customerId": lease.customerId,
        "vehicleId": lease.vehicleId,
        "startDate": lease.startDate,
        "endDate": lease.endDate,
        "serviceType": _enum_value(lease.serviceType),
        "monthlyRateAed": lease.monthlyRateAed,
        "vatRate": lease.vatRate,
        "mileageLimitMonthly": lease.mileageLimitMonthly,
        "downPaymentAed": lease.downPaymentAed,
        "status": _enum_value(lease.status),
        "renewalOfId": lease.renewalOfId,
        "agreementPdfUrl": lease.agreementPdfUrl,
        "notes": lease.notes,
        "createdAt": lease.createdAt,
        "updatedAt": lease.updatedAt,
    }
    vehicle = getattr(lease, "vehicle", None)
    if vehicle is not None:
        base["vehicle"] = {
            "brand": _enum_value(getattr(vehicle, "brand", None)),
            "model": getattr(vehicle, "model", None),
            "year": getattr(vehicle, "year", None),
            "plateNumber": getattr(vehicle, "plateNumber", None),
        }
    payments = getattr(lease, "payments", None)
    if payments is not None:
        base["payments"] = [_serialise_payment(p) for p in payments]
    booking = getattr(lease, "booking", None)
    if booking is not None:
        base["booking"] = {
            "reference": getattr(booking, "reference", None),
            "pickupLocation": getattr(booking, "pickupLocation", None),
        }
    return base


def _generate_reference() -> str:
    """`LS-<year>-<8-hex>` — matches the Node generator."""
    year = datetime.now(UTC).year
    seq = secrets.token_hex(4).upper()
    return f"LS-{year}-{seq}"


async def find_by_customer(
    db: Prisma,
    customer_id: str,
    *,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    List a customer's leases, newest first, capped at `limit` (default 50).

    Same defensive cap as bookings.find_by_customer — at 1k+ leases per
    customer the unbounded query (with full payment schedules included)
    would ship 5-10 MB of JSON on every dashboard load. Audit ref: #137 §3.
    """
    leases = await db.lease.find_many(
        where={"customerId": customer_id},
        include={
            "vehicle": {
                "select": {
                    "brand": True,
                    "model": True,
                    "year": True,
                    "plateNumber": True,
                }
            },
            "payments": {"order_by": {"dueDate": "asc"}},
        },
        order={"createdAt": "desc"},
        take=limit,
    )
    return [_serialise_lease(lease) for lease in leases]


async def find_one(db: Prisma, customer_id: str, lease_id: str) -> dict[str, Any]:
    """Get one lease with vehicle, payments, and booking stub."""
    lease = await db.lease.find_unique(
        where={"id": lease_id},
        include={
            "vehicle": True,
            "payments": {"order_by": {"dueDate": "asc"}},
            "booking": {"select": {"reference": True, "pickupLocation": True}},
        },
    )
    if lease is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")
    if lease.customerId != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return _serialise_lease(lease)


async def renew(
    db: Prisma,
    customer_id: str,
    lease_id: str,
    *,
    new_end_date: str,
    mileage_package: int | None,
) -> dict[str, Any]:
    """Renew an ACTIVE lease into a new ACTIVE lease starting at the old end."""
    lease = await db.lease.find_unique(where={"id": lease_id})
    if lease is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")
    if lease.customerId != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if _enum_value(lease.status) != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only active leases can be renewed",
        )

    new_end = _parse_iso_date(new_end_date, "new_end_date")

    # `lease.endDate` is a tz-aware datetime from Prisma; normalise the
    # caller's date so the comparison is between aware values.
    current_end = lease.endDate
    new_end_cmp = new_end if new_end.tzinfo else new_end.replace(tzinfo=UTC)
    current_end_cmp = current_end if current_end.tzinfo else current_end.replace(tzinfo=UTC)
    if new_end_cmp <= current_end_cmp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="new_end_date must be after current lease end date",
        )

    await db.lease.update(where={"id": lease_id}, data={"status": "RENEWED"})

    new_lease = await db.lease.create(
        data={
            "reference": _generate_reference(),
            "bookingId": lease.bookingId,
            "customerId": lease.customerId,
            "vehicleId": lease.vehicleId,
            "startDate": lease.endDate,
            "endDate": new_end,
            "monthlyRateAed": lease.monthlyRateAed,
            "vatRate": lease.vatRate,
            "mileageLimitMonthly": (
                mileage_package if mileage_package is not None else lease.mileageLimitMonthly
            ),
            "renewalOfId": lease_id,
            "status": "ACTIVE",
        }
    )
    return _serialise_lease(new_lease)


async def _free_vehicle_if_unleased(db: Prisma, vehicle_id: str) -> bool:
    """
    Set `vehicle.status` to AVAILABLE if no ACTIVE lease references it.

    Returns True if the vehicle was freed, False otherwise. The "no other
    active lease" guard is defensive — today the schema doesn't allow
    parallel ACTIVE leases on the same vehicle, but if it ever does (or if
    this is called mid-transition before the new lease is committed) we
    won't accidentally make a leased car bookable.
    """
    other_active = await db.lease.find_first(
        where={"vehicleId": vehicle_id, "status": "ACTIVE"},
    )
    if other_active is not None:
        return False
    await db.vehicle.update(
        where={"id": vehicle_id},
        data={"status": "AVAILABLE"},
    )
    return True


async def complete(
    db: Prisma,
    lease_id: str,
    *,
    admin_id: str,
) -> dict[str, Any]:
    """
    Admin-callable: mark an ACTIVE lease COMPLETED and free its vehicle.

    Idempotent — calling on an already-COMPLETED lease returns the current
    state without further side effects. Refuses to act on RENEWED leases
    (their vehicle is held by the renewal) or on a lease that doesn't exist.

    Until #121 ships its admin lease-termination workflow, this is the only
    way the system transitions a vehicle out of LEASED, so without it fleet
    utilisation reports lie permanently.
    """
    lease = await db.lease.find_unique(where={"id": lease_id})
    if lease is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")

    current_status = _enum_value(lease.status)
    if current_status == "COMPLETED":
        return _serialise_lease(lease)

    if current_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete lease in status {current_status}",
        )

    updated = await db.lease.update(
        where={"id": lease_id},
        data={"status": "COMPLETED"},
    )

    freed = await _free_vehicle_if_unleased(db, lease.vehicleId)

    await log_action(
        db,
        user_id=admin_id,
        action="COMPLETE",
        entity_type="LEASE",
        entity_id=lease_id,
        old_value={"status": current_status},
        new_value={"status": "COMPLETED", "vehicleFreed": freed},
    )

    return _serialise_lease(updated)
