"""
Calculator endpoint — mirrors apps/backend/src/calculator/calculator.controller.ts:

    POST /calculator/quote   Instant lease quote with VAT breakdown

Public (no auth) — same as the Node service.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from origin_backend.calculator import service
from origin_backend.calculator.schemas import QuoteRequest, QuoteResponse
from origin_backend.common.prisma import get_db
from prisma import Prisma

router = APIRouter(prefix="/calculator", tags=["calculator"])


@router.post(
    "/quote",
    response_model=QuoteResponse,
    response_model_by_alias=True,  # emit camelCase on the wire (#138 §1)
)
async def get_quote_endpoint(
    body: QuoteRequest,
    db: Prisma = Depends(get_db),
) -> object:
    """Compute a lease quote for a vehicle + date range."""
    return await service.get_quote(
        db,
        vehicle_id=body.vehicle_id,
        start_date=body.start_date,
        end_date=body.end_date,
        mileage_package=body.mileage_package,
        add_ons=body.add_ons,
    )
