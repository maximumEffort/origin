"""
KYC OCR endpoints (ADR-0002).

Admin surface (under /v1/admin):
    POST /admin/documents/{id}/reocr     re-trigger OCR on a document
    POST /admin/documents/{id}/approve   approve with optional per-field overrides
    POST /admin/documents/{id}/reject    reject with reason

The customer-facing single-document poll endpoint
    GET /v1/customers/me/documents/{id}
lives on the customers router (see customers/router.py) but uses
serialise_document from this module.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException

from origin_backend.common.auth import AuthenticatedUser, require_admin
from origin_backend.common.prisma import get_db
from origin_backend.common.request_context import RequestInfo, get_request_info
from origin_backend.kyc import service
from origin_backend.kyc.schemas import (
    ApproveDocumentRequest,
    ApproveResponse,
    RejectResponse,
    ReocrResponse,
)
from prisma import Prisma

router = APIRouter(prefix="/admin/documents", tags=["kyc-admin"])


@router.post("/{document_id}/reocr", response_model=ReocrResponse)
async def reocr_endpoint(
    document_id: str,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
) -> object:
    """Re-run OCR against the document. Resets ocrStatus and re-calls Azure DI."""
    return await service.reocr(db, background_tasks, document_id=document_id)


@router.post("/{document_id}/approve", response_model=ApproveResponse)
async def approve_endpoint(
    document_id: str,
    body: ApproveDocumentRequest | None = None,
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """
    Approve a KYC document. If the admin corrected any OCR-extracted fields
    in the review UI, pass them as `overrides` and they'll be persisted on
    the row as `reviewerOverrides` for audit.
    """
    return await service.approve(
        db,
        document_id=document_id,
        admin_id=user.id,
        overrides=body.overrides if body else None,
        ip_address=req_info.ip_address,
        user_agent=req_info.user_agent,
    )


@router.post("/{document_id}/reject", response_model=RejectResponse)
async def reject_endpoint(
    document_id: str,
    body: dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(require_admin("SUPER_ADMIN", "SALES")),
    db: Prisma = Depends(get_db),
    req_info: RequestInfo = Depends(get_request_info),
) -> object:
    """Reject a KYC document with a customer-visible reason."""
    reason = body.get("reason")
    if not reason or not isinstance(reason, str) or len(reason) < 1 or len(reason) > 500:
        raise HTTPException(status_code=422, detail="reason is required (1-500 characters)")
    return await service.reject(
        db,
        document_id=document_id,
        admin_id=user.id,
        reason=reason,
        ip_address=req_info.ip_address,
        user_agent=req_info.user_agent,
    )
