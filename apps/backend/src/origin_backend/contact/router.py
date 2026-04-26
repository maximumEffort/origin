"""
Contact endpoint — mirrors apps/backend/src/contact/contact.controller.ts:

    POST /contact   Submit a contact inquiry (public, rate-limited)

NOTE: The NestJS controller carries `@Throttle({ttl: 60000, limit: 5})`.
FastAPI has no built-in throttler; rate limiting will land here when the
shared middleware lands across the Python service.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from origin_backend.common.prisma import get_db
from origin_backend.contact import service
from origin_backend.contact.schemas import CreateContactRequest, CreateContactResponse
from prisma import Prisma

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=CreateContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact_endpoint(
    body: CreateContactRequest,
    db: Prisma = Depends(get_db),
) -> object:
    """Persist a contact inquiry; returns its id for tracking."""
    return await service.create(
        db,
        name=body.name,
        email=str(body.email),
        phone=body.phone,
        subject=body.subject,
        message=body.message,
    )
