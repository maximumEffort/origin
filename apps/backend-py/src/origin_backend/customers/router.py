"""
Customers endpoints — mirrors apps/backend/src/customers/customers.controller.ts:

    GET   /customers/me            Current customer profile + documents
    PATCH /customers/me            Update profile (partial)
    GET   /customers/me/documents  List KYC documents
    POST  /customers/me/documents  Upsert a KYC document by type

All endpoints require a customer access token.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from origin_backend.common.auth import AuthenticatedUser, require_customer
from origin_backend.common.prisma import get_db
from origin_backend.customers import service
from origin_backend.customers.schemas import (
    CreateDocumentRequest,
    CustomerProfile,
    CustomerSummary,
    DocumentResponse,
    UpdateCustomerRequest,
)
from prisma import Prisma

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/me", response_model=CustomerProfile)
async def get_me_endpoint(
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """Return the authenticated customer's full profile + KYC documents."""
    return await service.get_profile(db, user.id)


@router.patch("/me", response_model=CustomerSummary)
async def update_me_endpoint(
    body: UpdateCustomerRequest,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """Partially update the authenticated customer's profile."""
    return await service.update_profile(
        db,
        user.id,
        full_name=body.full_name,
        email=str(body.email) if body.email else None,
        preferred_language=body.preferred_language.value if body.preferred_language else None,
        whatsapp_opt_in=body.whatsapp_opt_in,
    )


@router.get("/me/documents", response_model=list[DocumentResponse])
async def list_my_documents_endpoint(
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """List the authenticated customer's KYC documents (newest first)."""
    return await service.get_documents(db, user.id)


@router.post("/me/documents", response_model=DocumentResponse)
async def add_document_endpoint(
    body: CreateDocumentRequest,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """Register (or re-submit) a KYC document by type."""
    return await service.add_document(
        db,
        user.id,
        document_type=body.type,
        file_url=str(body.file_url),
        expiry_date=body.expiry_date,
    )
