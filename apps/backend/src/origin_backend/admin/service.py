"""
Admin business logic.

Mirrors apps/backend/src/admin/admin.service.ts. Each function maps
directly to a controller endpoint; the role gating happens at the router
layer via require_admin(...).

Two SendGrid side-effects from the Node service (booking-approved and
kyc-rejected emails) are deferred to TODOs until the SendGrid integration
is ported — same pattern as bookings.create.
"""

from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from origin_backend.admin.schemas import CreateVehicleRequest, UpdateVehicleRequest
from origin_backend.common.audit import log_action
from origin_backend.integrations import sendgrid_email
from prisma import Prisma

logger = logging.getLogger(__name__)


def _enum_value(v: Any) -> str | None:
    if v is None:
        return None
    return v.value if hasattr(v, "value") else str(v)


def _parse_iso_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


# ── Bookings ──────────────────────────────────────────────────────────────


async def list_all_bookings(db: Prisma, status_filter: str | None) -> list[Any]:
    where: dict[str, Any] | None = {"status": status_filter} if status_filter else None
    return await db.booking.find_many(
        where=where,
        include={
            "customer": True,
            "vehicle": True,
        },
        order={"createdAt": "desc"},
    )


async def approve_booking(
    db: Prisma,
    booking_id: str,
    *,
    admin_id: str = "",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Any:
    booking = await db.booking.find_unique(where={"id": booking_id})
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if _enum_value(booking.status) != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only submitted bookings can be approved",
        )
    updated = await db.booking.update(
        where={"id": booking_id},
        data={"status": "APPROVED"},
    )

    await log_action(
        db,
        user_id=admin_id,
        action="APPROVE",
        entity_type="BOOKING",
        entity_id=booking_id,
        old_value={"status": _enum_value(booking.status)},
        new_value={"status": "APPROVED"},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    customer = await db.customer.find_unique(where={"id": booking.customerId})
    if customer is not None and customer.email:
        lang = _enum_value(customer.preferredLanguage) or "en"
        await sendgrid_email.send_booking_approved(
            customer.email,
            {
                "bookingRef": booking.reference,
                "customerName": customer.fullName,
                "startDate": booking.startDate.date().isoformat(),
                "endDate": booking.endDate.date().isoformat(),
                "totalAed": str(booking.grandTotalAed),
            },
            lang,  # type: ignore[arg-type]
        )
    return updated


async def reject_booking(
    db: Prisma,
    booking_id: str,
    reason: str | None,
    *,
    admin_id: str = "",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Any:
    booking = await db.booking.find_unique(where={"id": booking_id})
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if _enum_value(booking.status) != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only submitted bookings can be rejected",
        )
    data: dict[str, Any] = {"status": "REJECTED"}
    if reason:
        data["notes"] = reason
    result = await db.booking.update(where={"id": booking_id}, data=data)

    await log_action(
        db,
        user_id=admin_id,
        action="REJECT",
        entity_type="BOOKING",
        entity_id=booking_id,
        old_value={"status": _enum_value(booking.status)},
        new_value={"status": "REJECTED", "reason": reason},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return result


# ── Customers & KYC ───────────────────────────────────────────────────────


async def list_all_customers(db: Prisma, kyc_status: str | None) -> list[Any]:
    where: dict[str, Any] | None = {"kycStatus": kyc_status} if kyc_status else None
    return await db.customer.find_many(
        where=where,
        include={
            "documents": True,
        },
        order={"createdAt": "desc"},
    )


async def get_customer(db: Prisma, customer_id: str) -> Any:
    customer = await db.customer.find_unique(
        where={"id": customer_id},
        include={
            "documents": True,
            "bookings": {
                "order_by": {"createdAt": "desc"},
                "take": 10,
                "include": {"vehicle": True},
            },
            "leases": {"order_by": {"startDate": "desc"}, "take": 5},
        },
    )
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


async def approve_kyc(
    db: Prisma,
    customer_id: str,
    *,
    admin_id: str = "",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Any:
    customer = await db.customer.find_unique(where={"id": customer_id})
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    if _enum_value(customer.kycStatus) != "SUBMITTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only submitted KYC applications can be approved",
        )
    result = await db.customer.update(
        where={"id": customer_id},
        data={"kycStatus": "APPROVED"},
    )

    await log_action(
        db,
        user_id=admin_id,
        action="APPROVE",
        entity_type="CUSTOMER_KYC",
        entity_id=customer_id,
        old_value={"kycStatus": _enum_value(customer.kycStatus)},
        new_value={"kycStatus": "APPROVED"},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return result


async def reject_kyc(
    db: Prisma,
    customer_id: str,
    reason: str | None,
    *,
    admin_id: str = "",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Any:
    customer = await db.customer.find_unique(where={"id": customer_id})
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    data: dict[str, Any] = {"kycStatus": "REJECTED"}
    if reason:
        data["kycRejectionReason"] = reason
    updated = await db.customer.update(where={"id": customer_id}, data=data)

    await log_action(
        db,
        user_id=admin_id,
        action="REJECT",
        entity_type="CUSTOMER_KYC",
        entity_id=customer_id,
        old_value={"kycStatus": _enum_value(customer.kycStatus)},
        new_value={"kycStatus": "REJECTED", "reason": reason},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    if customer.email:
        lang = _enum_value(customer.preferredLanguage) or "en"
        await sendgrid_email.send_kyc_incomplete_alert(
            customer.email,
            {"customerName": customer.fullName, "rejectionReason": reason or ""},
            lang,  # type: ignore[arg-type]
        )
    return updated


# ── Lease creation from booking ───────────────────────────────────────────


async def create_lease_from_booking(
    db: Prisma,
    booking_id: str,
    *,
    admin_id: str = "",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Any:
    booking = await db.booking.find_unique(
        where={"id": booking_id},
        include={"vehicle": True},
    )
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if _enum_value(booking.status) != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved bookings can be converted to leases",
        )

    existing = await db.lease.find_first(where={"bookingId": booking_id})
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A lease already exists for this booking",
        )

    # Average month length — matches the Node calculation.
    ms_per_month = 30.44 * 24 * 60 * 60 * 1000
    end_ms = booking.endDate.timestamp() * 1000
    start_ms = booking.startDate.timestamp() * 1000
    duration_months = max(1, round((end_ms - start_ms) / ms_per_month))

    quoted_total = float(booking.quotedTotalAed) if booking.quotedTotalAed is not None else 0.0
    fallback_monthly = (
        float(booking.vehicle.monthlyRateAed)
        if booking.vehicle is not None and booking.vehicle.monthlyRateAed is not None
        else 0.0
    )
    monthly_rate = (quoted_total / duration_months) if quoted_total else fallback_monthly

    lease_count = await db.lease.count()
    year = datetime.now(UTC).year
    reference = f"LS-{year}-{(lease_count + 1):05d}"

    lease = await db.lease.create(
        data={
            "reference": reference,
            "customerId": booking.customerId,
            "vehicleId": booking.vehicleId,
            "bookingId": booking.id,
            "startDate": booking.startDate,
            "endDate": booking.endDate,
            "monthlyRateAed": monthly_rate,
            "vatRate": 0.05,
            "mileageLimitMonthly": booking.mileagePackage or 3000,
            "status": "ACTIVE",
        }
    )

    await db.vehicle.update(
        where={"id": booking.vehicleId},
        data={"status": "LEASED"},
    )
    await db.booking.update(
        where={"id": booking_id},
        data={"status": "CONVERTED"},
    )

    payments: list[dict[str, Any]] = []
    for i in range(duration_months):
        # Match JS Date.setMonth(i) — preserve day-of-month, advance month.
        due = booking.startDate.replace(
            month=((booking.startDate.month - 1 + i) % 12) + 1,
            year=booking.startDate.year + ((booking.startDate.month - 1 + i) // 12),
        )
        payments.append(
            {
                "leaseId": lease.id,
                "customerId": booking.customerId,
                "type": "DEPOSIT" if i == 0 else "MONTHLY",
                "amountAed": monthly_rate,
                "vatAmountAed": monthly_rate * 0.05,
                "totalAed": monthly_rate * 1.05,
                "dueDate": due,
                "status": "PENDING",
            }
        )

    if payments:
        await db.payment.create_many(data=payments)

    await log_action(
        db,
        user_id=admin_id,
        action="CREATE",
        entity_type="LEASE",
        entity_id=lease.id,
        new_value={"bookingId": booking_id, "reference": reference},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return lease


# ── Leases ────────────────────────────────────────────────────────────────


async def list_all_leases(db: Prisma, status_filter: str | None) -> list[Any]:
    where: dict[str, Any] | None = {"status": status_filter} if status_filter else None
    return await db.lease.find_many(
        where=where,
        include={
            "customer": True,
            "vehicle": True,
            "payments": {"order_by": {"dueDate": "asc"}},
        },
        order={"createdAt": "desc"},
    )


# ── Fleet / Vehicles ──────────────────────────────────────────────────────


async def list_all_vehicles(db: Prisma, status_filter: str | None) -> list[Any]:
    where: dict[str, Any] | None = {"status": status_filter} if status_filter else None
    return await db.vehicle.find_many(
        where=where,
        include={
            "category": True,
            "images": {"where": {"isPrimary": True}, "take": 1},
        },
        order={"createdAt": "desc"},
    )


async def create_vehicle(
    db: Prisma,
    dto: CreateVehicleRequest,
    *,
    admin_id: str = "",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Any:
    """Create a vehicle, auto-generating VIN + category if missing."""
    vin = f"ORIGIN-{int(datetime.now(UTC).timestamp() * 1000)}-{secrets.token_hex(3).upper()}"

    fuel_type = (dto.fuel_type or "ELECTRIC").upper()
    category_id = dto.category_id
    if not category_id:
        category_name = (
            "Electric"
            if fuel_type == "ELECTRIC"
            else "Hybrid"
            if fuel_type == "HYBRID"
            else "Standard"
        )
        category = await db.vehiclecategory.find_first(
            where={"nameEn": {"contains": category_name}},
        )
        if category is None:
            category = await db.vehiclecategory.create(
                data={
                    "nameEn": category_name,
                    "nameAr": category_name,
                    "nameZh": category_name,
                }
            )
        category_id = category.id

    data: dict[str, Any] = {
        "brand": dto.brand,
        "model": dto.model,
        "year": dto.year,
        "colour": dto.colour,
        "plateNumber": dto.plate_number,
        "seats": dto.seats,
        "monthlyRateAed": dto.monthly_rate_aed,
        "dailyRateAed": dto.daily_rate_aed if dto.daily_rate_aed is not None else 0,
        "mileageLimitMonthly": dto.mileage_limit_monthly,
        "fuelType": fuel_type,
        "transmission": (dto.transmission or "AUTOMATIC").upper(),
        "notes": dto.notes,
        "priceAed": dto.price_aed,
        "leaseMonthlyAed": dto.lease_monthly_aed,
        "insuranceExpiry": _parse_iso_dt(dto.insurance_expiry),
        "rtaRegistrationExpiry": _parse_iso_dt(dto.rta_registration_expiry),
        "vin": vin,
        "categoryId": category_id,
    }
    vehicle = await db.vehicle.create(data=data)

    await log_action(
        db,
        user_id=admin_id,
        action="CREATE",
        entity_type="VEHICLE",
        entity_id=vehicle.id if vehicle else "",
        new_value={"brand": dto.brand, "model": dto.model, "plateNumber": dto.plate_number},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return vehicle


async def update_vehicle(
    db: Prisma,
    vehicle_id: str,
    dto: UpdateVehicleRequest,
    *,
    admin_id: str = "",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Any:
    vehicle = await db.vehicle.find_unique(where={"id": vehicle_id})
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    data: dict[str, Any] = {}
    if dto.brand is not None:
        data["brand"] = dto.brand
    if dto.model is not None:
        data["model"] = dto.model
    if dto.year is not None:
        data["year"] = dto.year
    if dto.monthly_rate_aed is not None:
        data["monthlyRateAed"] = dto.monthly_rate_aed
    if dto.daily_rate_aed is not None:
        data["dailyRateAed"] = dto.daily_rate_aed
    if dto.colour is not None:
        data["colour"] = dto.colour
    if dto.plate_number is not None:
        data["plateNumber"] = dto.plate_number
    if dto.mileage_limit_monthly is not None:
        data["mileageLimitMonthly"] = dto.mileage_limit_monthly
    if dto.seats is not None:
        data["seats"] = dto.seats
    if dto.fuel_type is not None:
        data["fuelType"] = dto.fuel_type
    if dto.status is not None:
        data["status"] = dto.status
    if dto.price_aed is not None:
        data["priceAed"] = dto.price_aed
    if dto.lease_monthly_aed is not None:
        data["leaseMonthlyAed"] = dto.lease_monthly_aed
    if dto.notes is not None:
        data["notes"] = dto.notes
    if dto.insurance_expiry is not None:
        data["insuranceExpiry"] = _parse_iso_dt(dto.insurance_expiry)
    if dto.rta_registration_expiry is not None:
        data["rtaRegistrationExpiry"] = _parse_iso_dt(dto.rta_registration_expiry)

    if not data:
        return vehicle
    result = await db.vehicle.update(where={"id": vehicle_id}, data=data)

    await log_action(
        db,
        user_id=admin_id,
        action="UPDATE",
        entity_type="VEHICLE",
        entity_id=vehicle_id,
        old_value=None,
        new_value=data,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return result


async def set_vehicle_status(
    db: Prisma,
    vehicle_id: str,
    new_status: str,
    *,
    admin_id: str = "",
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Any:
    vehicle = await db.vehicle.find_unique(where={"id": vehicle_id})
    if vehicle is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    result = await db.vehicle.update(
        where={"id": vehicle_id},
        data={"status": new_status},
    )

    await log_action(
        db,
        user_id=admin_id,
        action="UPDATE_STATUS",
        entity_type="VEHICLE",
        entity_id=vehicle_id,
        old_value={"status": _enum_value(vehicle.status)},
        new_value={"status": new_status},
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return result


# ── Dashboard ─────────────────────────────────────────────────────────────


async def get_dashboard_stats(db: Prisma) -> dict[str, Any]:
    """Aggregate the back-office KPIs in one round-trip via gather()."""
    import asyncio

    (
        total_customers,
        pending_kyc,
        pending_bookings,
        active_leases,
        available_vehicles,
        paid_payments,
    ) = await asyncio.gather(
        db.customer.count(),
        db.customer.count(where={"kycStatus": "SUBMITTED"}),
        db.booking.count(where={"status": "SUBMITTED"}),
        db.lease.count(where={"status": "ACTIVE"}),
        db.vehicle.count(where={"status": "AVAILABLE"}),
        db.payment.find_many(where={"status": "PAID"}),
    )

    # Prisma Python's aggregate API surface differs from the Node SDK; fetch
    # paid rows and sum in Python. Volume is dashboard-scale (low) so this
    # is fine.
    revenue_aed = float(sum((p.amountAed for p in paid_payments), start=0))

    return {
        "totalCustomers": total_customers,
        "pendingKyc": pending_kyc,
        "pendingBookings": pending_bookings,
        "activeLeases": active_leases,
        "availableVehicles": available_vehicles,
        "totalRevenueAed": revenue_aed,
    }
