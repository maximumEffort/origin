"""
Customers endpoints — mirrors apps/backend/src/customers/customers.controller.ts:

    GET   /customers/me                  Current customer profile + documents
    PATCH /customers/me                  Update profile (partial)
    GET   /customers/me/documents        List KYC documents
    POST  /customers/me/documents        Upsert a KYC document by type (URL)
    POST  /customers/me/documents/upload Upload a file and create Document row
    GET   /customers/me/documents/{id}   Single document (OCR poll)

All endpoints require a customer access token.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile

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


@router.get("/me/documents/{document_id}", response_model=DocumentResponse)
async def get_my_document_endpoint(
    document_id: str,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """
    Fetch a single KYC document — used by the customer-side OCR poll loop
    after upload. Returns the OCR-enriched DocumentResponse so the form can
    pre-fill from `ocrFields` once `ocrStatus == 'COMPLETED'`.

    Scoped to the calling customer; 404 on cross-tenant access attempts.
    """
    return await service.get_document(db, user.id, document_id)


@router.post("/me/documents", response_model=DocumentResponse)
async def add_document_endpoint(
    body: CreateDocumentRequest,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """
    Register (or re-submit) a KYC document by type.

    When `KYC_OCR_ENABLED=true`, the service layer enqueues an Azure DI OCR
    job in the background and the customer can poll
    `GET /me/documents/{id}` to watch ocrStatus PROCESSING -> COMPLETED.
    The HTTP response itself returns immediately with `ocrStatus` reflecting
    the just-enqueued state.
    """
    return await service.add_document(
        db,
        user.id,
        document_type=body.type,
        file_url=str(body.file_url),
        expiry_date=body.expiry_date,
        background_tasks=background_tasks,
    )


@router.post("/me/documents/upload", response_model=DocumentResponse)
async def upload_document_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="KYC document image or PDF (max 10 MB)"),
    type: str = Form(..., description="EMIRATES_ID | DRIVING_LICENCE | VISA | PASSPORT"),
    expiry_date: str | None = Form(None, alias="expiryDate"),
    user: AuthenticatedUser = Depends(require_customer),
    db: Prisma = Depends(get_db),
) -> object:
    """
    Upload a KYC document file and create the Document record in one step.

    Accepts multipart/form-data with the file and document metadata.  The
    file is stored in Azure Blob (production) or a local directory (dev),
    and a Document row is created with the resulting fileUrl.  When
    KYC_OCR_ENABLED=true, OCR is enqueued in the background.

    This is the endpoint the customer booking flow (BookingFlow.tsx Step 3)
    calls when the user selects a file.  It replaces the previous
    metadata-only approach that never actually uploaded files (issue #75).
    """
    return await service.upload_and_create_document(
        db,
        user.id,
        file=file,
        document_type=type,
        expiry_date=expiry_date,
        background_tasks=background_tasks,
    )
