"""
KYC OCR business logic (ADR-0002).

The Document row goes through this state machine:

    upload → ocrStatus=NOT_STARTED
       ↓ (when KYC_OCR_ENABLED=true and doc_type is OCR-supported)
    enqueue_ocr() → ocrStatus=PROCESSING, ocrRequestedAt=now
       ↓ (background task)
    run_ocr() → calls Azure DI, writes ocrFields + ocrConfidence,
                ocrStatus=COMPLETED + ocrCompletedAt=now
       (or after settings.kyc_ocr_max_retries failures:)
       → ocrStatus=FAILED, ocrFailureReason populated
       ↓ (admin reviews via admin/documents/{id}/{approve,reject})
    approve()/reject() → status=APPROVED|REJECTED, reviewedAt, reviewedBy

The functions here all accept a Prisma client as an argument so they're
trivially mockable from tests.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import BackgroundTasks, HTTPException, status

from origin_backend.config import settings
from origin_backend.customers.schemas import DocumentType
from origin_backend.kyc import ocr as ocr_client
from prisma import Prisma

logger = logging.getLogger(__name__)


# Document types we attempt OCR on. Visa is intentionally SKIPPED in V1
# because visa stickers vary too much for reliable extraction.
_OCR_SUPPORTED_TYPES = {
    DocumentType.EMIRATES_ID,
    DocumentType.PASSPORT,
    DocumentType.DRIVING_LICENCE,
}


def schedule_ocr_if_enabled(
    background_tasks: BackgroundTasks | None,
    db: Prisma,
    *,
    document_id: str,
    doc_type: str,
    file_url: str,
) -> None:
    """
    Hook called from customers.service.add_document().

    No-op when:
      - feature flag is off (settings.kyc_ocr_enabled == False)
      - document type isn't in _OCR_SUPPORTED_TYPES
      - background_tasks is None (e.g. unit tests not exercising the hook)

    Otherwise enqueues a FastAPI BackgroundTask that runs OCR and updates the
    Document row when done. V1.1 will replace this with a Service Bus queue
    so revisions restarting mid-job don't lose work.
    """
    if not settings.kyc_ocr_configured:
        logger.debug("KYC OCR not configured — skipping enqueue for doc %s", document_id)
        return
    if background_tasks is None:
        logger.debug("No BackgroundTasks available — skipping enqueue for doc %s", document_id)
        return
    try:
        doc_type_enum = DocumentType(doc_type)
    except ValueError:
        logger.warning("Unknown doc_type %s — skipping OCR enqueue", doc_type)
        return
    if doc_type_enum not in _OCR_SUPPORTED_TYPES:
        # Mark as SKIPPED so admin UI knows we deliberately didn't OCR this one.
        background_tasks.add_task(_mark_skipped, db, document_id)
        return

    background_tasks.add_task(
        run_ocr,
        db,
        document_id=document_id,
        doc_type=doc_type_enum,
        file_url=file_url,
    )


async def run_ocr(
    db: Prisma,
    *,
    document_id: str,
    doc_type: DocumentType,
    file_url: str,
) -> None:
    """
    Worker that runs Azure DI and updates the Document row.

    Flips ocrStatus PROCESSING -> COMPLETED on success, FAILED after
    settings.kyc_ocr_max_retries retries. Never raises — failures land in
    the row so admin UI can surface them.
    """
    await db.document.update(
        where={"id": document_id},
        data={
            "ocrStatus": "PROCESSING",
            "ocrRequestedAt": datetime.now(timezone.utc),
            "ocrProvider": ocr_client.PROVIDER_ID,
            "ocrModel": ocr_client.model_for(doc_type),
        },
    )

    last_error: Exception | None = None
    for attempt in range(1, settings.kyc_ocr_max_retries + 1):
        try:
            curated = await ocr_client.extract(doc_type=doc_type, file_url=file_url)
        except Exception as e:
            last_error = e
            logger.warning(
                "OCR attempt %d/%d failed for doc %s: %s",
                attempt,
                settings.kyc_ocr_max_retries,
                document_id,
                e,
            )
            continue

        await db.document.update(
            where={"id": document_id},
            data={
                "ocrStatus": "COMPLETED",
                "ocrFields": curated["fields"] | {
                    "_meta": {
                        "modelId": curated["modelId"],
                        "documentType": curated["documentType"],
                        "rawDocumentResultPath": curated.get("rawDocumentResultPath"),
                    }
                },
                "ocrConfidence": curated["overallConfidence"],
                "ocrCompletedAt": datetime.now(timezone.utc),
                "ocrFailureReason": None,
            },
        )
        return

    # All retries exhausted.
    await db.document.update(
        where={"id": document_id},
        data={
            "ocrStatus": "FAILED",
            "ocrFailureReason": str(last_error)[:500] if last_error else "OCR failed (unknown reason)",
            "ocrCompletedAt": datetime.now(timezone.utc),
        },
    )


async def _mark_skipped(db: Prisma, document_id: str) -> None:
    """Mark a document as SKIPPED — type doesn't support OCR in this phase."""
    await db.document.update(
        where={"id": document_id},
        data={
            "ocrStatus": "SKIPPED",
            "ocrRequestedAt": datetime.now(timezone.utc),
            "ocrCompletedAt": datetime.now(timezone.utc),
        },
    )


# ── Admin actions ─────────────────────────────────────────────────────────────


async def reocr(
    db: Prisma,
    background_tasks: BackgroundTasks,
    *,
    document_id: str,
) -> dict[str, Any]:
    """Admin re-trigger of OCR on an existing document. Resets ocrStatus."""
    doc = await db.document.find_unique(where={"id": document_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        doc_type = DocumentType(doc.type if isinstance(doc.type, str) else doc.type.value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Document has unknown type") from e

    if doc_type not in _OCR_SUPPORTED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Document type {doc_type.value} is not OCR-supported in this phase",
        )

    background_tasks.add_task(
        run_ocr,
        db,
        document_id=document_id,
        doc_type=doc_type,
        file_url=doc.fileUrl,
    )
    return {
        "documentId": document_id,
        "ocrStatus": "PROCESSING",
        "enqueuedAt": datetime.now(timezone.utc),
    }


async def approve(
    db: Prisma,
    *,
    document_id: str,
    admin_id: str,
    overrides: dict[str, str] | None,
) -> dict[str, Any]:
    """Admin approves a KYC document. Persists per-field overrides for audit."""
    doc = await db.document.find_unique(where={"id": document_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    now = datetime.now(timezone.utc)
    overrides_clean = {k: v for k, v in (overrides or {}).items() if v}

    updated = await db.document.update(
        where={"id": document_id},
        data={
            "status": "APPROVED",
            "rejectionReason": None,
            "reviewedAt": now,
            "reviewedBy": admin_id,
            "reviewerOverrides": overrides_clean if overrides_clean else None,
        },
    )

    # Auto-promote KYC if both EID + DL approved.
    await _maybe_promote_kyc(db, customer_id=updated.customerId)

    return {
        "documentId": document_id,
        "status": "APPROVED",
        "reviewedAt": now,
        "reviewedBy": admin_id,
        "overridesCount": len(overrides_clean),
    }


async def reject(
    db: Prisma,
    *,
    document_id: str,
    admin_id: str,
    reason: str,
) -> dict[str, Any]:
    """Admin rejects a KYC document with a reason."""
    doc = await db.document.find_unique(where={"id": document_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    now = datetime.now(timezone.utc)
    await db.document.update(
        where={"id": document_id},
        data={
            "status": "REJECTED",
            "rejectionReason": reason,
            "reviewedAt": now,
            "reviewedBy": admin_id,
        },
    )

    return {
        "documentId": document_id,
        "status": "REJECTED",
        "rejectionReason": reason,
        "reviewedAt": now,
        "reviewedBy": admin_id,
    }


async def _maybe_promote_kyc(db: Prisma, *, customer_id: str) -> None:
    """
    If a customer now has at least one APPROVED Emirates ID and at least one
    APPROVED Driving Licence, flip their kycStatus to APPROVED.

    Per CLAUDE.md, KYC needs Emirates ID + Driving Licence at minimum to rent.
    Visa + passport are required by some customer flows but aren't blocking.
    """
    docs = await db.document.find_many(
        where={"customerId": customer_id, "status": "APPROVED"},
    )
    has_eid = any((d.type if isinstance(d.type, str) else d.type.value) == "EMIRATES_ID" for d in docs)
    has_dl = any(
        (d.type if isinstance(d.type, str) else d.type.value) == "DRIVING_LICENCE" for d in docs
    )
    if has_eid and has_dl:
        await db.customer.update(
            where={"id": customer_id},
            data={"kycStatus": "APPROVED", "kycRejectionReason": None},
        )


# ── Read helpers ────────────────────────────────────────────────────────────


async def get_document(db: Prisma, *, document_id: str, customer_id: str | None = None) -> Any:
    """
    Fetch a single document by id. If `customer_id` is provided, scope the
    lookup to that customer (used by the customer-side poll endpoint to
    prevent cross-tenant access).
    """
    doc = await db.document.find_unique(where={"id": document_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if customer_id is not None and doc.customerId != customer_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


def serialise_document(doc: Any) -> dict[str, Any]:
    """
    Serialise a Document row including OCR fields. Used by both the customers
    router (list/get-by-id) and the admin router. Mirrors customers.service
    `_serialise_document` but with the OCR additions.
    """
    def enum_val(v: Any) -> str | None:
        if v is None:
            return None
        return v.value if hasattr(v, "value") else str(v)

    return {
        "id": doc.id,
        "customerId": doc.customerId,
        "type": enum_val(doc.type),
        "fileUrl": doc.fileUrl,
        "expiryDate": doc.expiryDate,
        "status": enum_val(doc.status),
        "rejectionReason": doc.rejectionReason,
        "uploadedAt": doc.uploadedAt,
        "reviewedAt": doc.reviewedAt,
        "reviewedBy": doc.reviewedBy,
        # OCR
        "ocrStatus": enum_val(getattr(doc, "ocrStatus", None)) or "NOT_STARTED",
        "ocrProvider": getattr(doc, "ocrProvider", None),
        "ocrModel": getattr(doc, "ocrModel", None),
        "ocrFields": getattr(doc, "ocrFields", None),
        "ocrConfidence": getattr(doc, "ocrConfidence", None),
        "ocrRequestedAt": getattr(doc, "ocrRequestedAt", None),
        "ocrCompletedAt": getattr(doc, "ocrCompletedAt", None),
        "ocrFailureReason": getattr(doc, "ocrFailureReason", None),
        "reviewerOverrides": getattr(doc, "reviewerOverrides", None),
    }
