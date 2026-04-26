"""
Leases endpoints — mirrors apps/backend/src/leases/leases.controller.ts:

    GET  /leases             List the customer's leases
    GET  /leases/:id         Lease detail (own leases only)
    POST /leases/:id/renew   Renew an active lease

All endpoints require a customer access token.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from origin_backend.common.auth import AuthenticatedUser, require_customer
from origin_backend.common.prisma import get_db
from origin_backend.leases import service
from origin_backend.leases.schemas import LeaseResponse, RenewLeaseRequest
from prisma import Prisma

router = APIRouter(prefix="/leases", tags=["leases"])


@router.get("", response_model=list[LeaseResponse])
async def list_leases_endpoint(
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """List the authenticated customer's leases (newest first)."""
    return await service.find_by_customer(db, user.id)


@router.get("/{lease_id}", response_model=LeaseResponse)
async def get_lease_endpoint(
    lease_id: str,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """Get a single lease. 403 if it belongs to another customer."""
    return await service.find_one(db, user.id, lease_id)


@router.post("/{lease_id}/renew", response_model=LeaseResponse)
async def renew_lease_endpoint(
    lease_id: str,
    body: RenewLeaseRequest,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """Renew an active lease into a new active lease."""
    return await service.renew(
        db,
        user.id,
        lease_id,
        new_end_date=body.new_end_date,
        mileage_package=body.mileage_package,
    )
