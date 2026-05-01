"""Public modular API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.encoders import jsonable_encoder

from origin_backend.common.auth import AuthenticatedUser, require_customer
from origin_backend.common.prisma import get_db
from origin_backend.gateways.dependencies import get_country
from origin_backend.gateways.public_api.schemas import (
    CountryBootstrapResponse,
    RentalBookingRequest,
    RentalQuoteRequest,
)
from origin_backend.platform.pricing.service import quote_rental
from origin_backend.products.rental.service import create_draft_booking

router = APIRouter(prefix="/public", tags=["public-api"])


def _json(value: Any) -> Any:
    return jsonable_encoder(value)


@router.get("/countries/current", response_model=CountryBootstrapResponse)
async def get_current_country_endpoint(
    country: Any = Depends(get_country),
    db: Any = Depends(get_db),
) -> dict[str, Any]:
    docs = await db.kycdocumenttype.find_many(
        where={"countryId": country.id, "isActive": True},
        order={"sortOrder": "asc"},
    )
    return {
        "id": country.id,
        "code": country.code,
        "name": country.name,
        "defaultCurrencyCode": country.defaultCurrencyCode,
        "vatRate": float(country.vatRate),
        "productFlags": country.productFlags or {},
        "paymentGateways": country.enabledPaymentGateways or [],
        "kycDocumentTypes": [
            {
                "code": d.code,
                "labelEn": d.labelEn,
                "labelAr": d.labelAr,
                "labelZh": d.labelZh,
                "isRequired": d.isRequired,
                "requiresExpiry": d.requiresExpiry,
            }
            for d in docs
        ],
    }


@router.post("/quotes/rental")
async def quote_rental_endpoint(
    body: RentalQuoteRequest,
    country: Any = Depends(get_country),
    db: Any = Depends(get_db),
) -> Any:
    return await quote_rental(
        db,
        country=country,
        vehicle_id=body.vehicle_id,
        start_date=body.start_date,
        end_date=body.end_date,
        mileage_package=body.mileage_package,
        add_ons=body.add_ons,
    )


@router.post("/bookings/rental", status_code=status.HTTP_201_CREATED)
async def create_rental_booking_endpoint(
    body: RentalBookingRequest,
    user: AuthenticatedUser = Depends(require_customer),
    country: Any = Depends(get_country),
    db: Any = Depends(get_db),
) -> Any:
    booking = await create_draft_booking(
        db,
        country=country,
        customer_id=user.id,
        vehicle_id=body.vehicle_id,
        start_date=body.start_date,
        end_date=body.end_date,
        mileage_package=body.mileage_package,
        add_ons=body.add_ons,
        pickup_location=body.pickup_location,
        dropoff_location=body.dropoff_location,
        notes=body.notes,
    )
    return _json(booking)

