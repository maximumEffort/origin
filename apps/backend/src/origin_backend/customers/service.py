"""
Customers business logic.

Mirrors apps/backend/src/customers/customers.service.ts. Functions take
Prisma as an explicit argument (DI via FastAPI Depends in the router) so
they're trivially testable with a mocked client.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import BackgroundTasks, HTTPException, status

from origin_backend.customers.schemas import DocumentType
from origin_backend.kyc import service as kyc_service
from prisma import Prisma


def _enum_value(v: Any) -> str | None:
    """Prisma Python returns enums as Python enum members; coerce to str."""
    if v is None:
        return None
    return v.value if hasattr(v, "value") else str(v)


def _serialise_document(doc: Any) -> dict[str, Any]:
    """
    Serialise a Document row including OCR fields (ADR-0002).

    For documents created before the OCR migration, the new columns will
    be `None` / `'NOT_STARTED'` and the response stays backwards-compatible.
    """
    return {
        "id": doc.id,
        "customerId": doc.customerId,
        "type": _enum_value(doc.type),
        "fileUrl": doc.fileUrl,
        "expiryDate": doc.expiryDate,
        "status": _enum_value(doc.status),
        "rejectionReason": doc.rejectionReason,
        "uploadedAt": doc.uploadedAt,
        "reviewedAt": doc.reviewedAt,
        "reviewedBy": doc.reviewedBy,
        # ── OCR (ADR-0002) ──
        "ocrStatus": _enum_value(getattr(doc, "ocrStatus", None)) or "NOT_STARTED",
        "ocrProvider": getattr(doc, "ocrProvider", None),
        "ocrModel": getattr(doc, "ocrModel", None),
        "ocrFields": getattr(doc, "ocrFields", None),
        "ocrConfidence": getattr(doc, "ocrConfidence", None),
        "ocrRequestedAt": getattr(doc, "ocrRequestedAt", None),
        "ocrCompletedAt": getattr(doc, "ocrCompletedAt", None),
        "ocrFailureReason": getattr(doc, "ocrFailureReason", None),
        "reviewerOverrides": getattr(doc, "reviewerOverrides", None),
    }


def _serialise_customer(customer: Any, *, include_documents: bool = False) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": customer.id,
        "phone": customer.phone,
        "email": customer.email,
        "fullName": customer.fullName,
        "nationality": customer.nationality,
        "preferredLanguage": _enum_value(customer.preferredLanguage),
        "kycStatus": _enum_value(customer.kycStatus),
        "kycRejectionReason": customer.kycRejectionReason,
        "whatsappOptIn": customer.whatsappOptIn,
        "createdAt": customer.createdAt,
        "updatedAt": customer.updatedAt,
    }
    if include_documents:
        docs = getattr(customer, "documents", None) or []
        base["documents"] = [_serialise_document(d) for d in docs]
    return base


def _parse_expiry(expiry: str | None) -> datetime | None:
    """Accept ISO-8601 date or datetime; return UTC datetime or None."""
    if not expiry:
        return None
    # `fromisoformat` since 3.11 accepts both 'YYYY-MM-DD' and full ISO datetimes.
    try:
        return datetime.fromisoformat(expiry.replace("Z", "+00:00"))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="expiryDate must be a valid ISO-8601 date",
        ) from e


async def get_profile(db: Prisma, customer_id: str) -> dict[str, Any]:
    """Return the full customer record with KYC documents (newest first)."""
    customer = await db.customer.find_unique(
        where={"id": customer_id},
        include={"documents": {"order_by": {"uploadedAt": "desc"}}},
    )
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )
    return _serialise_customer(customer, include_documents=True)


async def update_profile(
    db: Prisma,
    customer_id: str,
    *,
    full_name: str | None,
    email: str | None,
    preferred_language: str | None,
    whatsapp_opt_in: bool | None,
) -> dict[str, Any]:
    """PATCH /customers/me — partial update of the profile."""
    data: dict[str, Any] = {}
    if full_name is not None:
        data["fullName"] = full_name
    if email is not None:
        data["email"] = email
    if preferred_language is not None:
        data["preferredLanguage"] = preferred_language
    if whatsapp_opt_in is not None:
        data["whatsappOptIn"] = whatsapp_opt_in

    if not data:
        # Nothing to update — return the existing record so the response shape
        # is stable. Prisma's `update` with `data={}` raises in strict mode.
        existing = await db.customer.find_unique(where={"id": customer_id})
        if existing is None:
            raise HTTPException(status_code=404, detail="Customer not found")
        return _serialise_customer(existing)

    updated = await db.customer.update(where={"id": customer_id}, data=data)
    return _serialise_customer(updated)


async def get_documents(db: Prisma, customer_id: str) -> list[dict[str, Any]]:
    """List the customer's KYC documents (newest first)."""
    docs = await db.document.find_many(
        where={"customerId": customer_id},
        order={"uploadedAt": "desc"},
    )
    return [_serialise_document(d) for d in docs]


async def add_document(
    db: Prisma,
    customer_id: str,
    *,
    document_type: DocumentType,
    file_url: str,
    expiry_date: str | None,
    background_tasks: BackgroundTasks | None = None,
) -> dict[str, Any]:
    """
    Register a KYC document. If a document of the same type exists, update
    it (re-submit flow); otherwise create. Once the customer has at least
    two documents, mark their KYC as SUBMITTED for the back-office to review.

    When `background_tasks` is provided AND `KYC_OCR_ENABLED=true`, the
    document is also enqueued for OCR via Azure Document Intelligence
    (ADR-0002). The customer-side response returns immediately; the OCR
    result is written back to the row asynchronously and surfaced via the
    extended DocumentResponse shape.
    """
    type_value = document_type.value
    expiry_dt = _parse_expiry(expiry_date)

    existing = await db.document.find_first(
        where={"customerId": customer_id, "type": type_value},
    )

    if existing is not None:
        update_data: dict[str, Any] = {
            "fileUrl": file_url,
            "status": "PENDING",
            "rejectionReason": None,
            # Reset OCR state on re-submit so the new file gets re-processed.
            "ocrStatus": "NOT_STARTED",
            "ocrFields": None,
            "ocrConfidence": None,
            "ocrFailureReason": None,
            "ocrCompletedAt": None,
            "reviewerOverrides": None,
        }
        if expiry_dt is not None:
            update_data["expiryDate"] = expiry_dt
        updated = await db.document.update(where={"id": existing.id}, data=update_data)
        kyc_service.schedule_ocr_if_enabled(
            background_tasks,
            db,
            document_id=updated.id,
            doc_type=type_value,
            file_url=file_url,
        )
        return _serialise_document(updated)

    create_data: dict[str, Any] = {
        "customerId": customer_id,
        "type": type_value,
        "fileUrl": file_url,
        "status": "PENDING",
    }
    if expiry_dt is not None:
        create_data["expiryDate"] = expiry_dt

    doc = await db.document.create(data=create_data)

    doc_count = await db.document.count(where={"customerId": customer_id})
    if doc_count >= 2:
        await db.customer.update(
            where={"id": customer_id},
            data={"kycStatus": "SUBMITTED"},
        )

    kyc_service.schedule_ocr_if_enabled(
        background_tasks,
        db,
        document_id=doc.id,
        doc_type=type_value,
        file_url=file_url,
    )

    return _serialise_document(doc)


async def get_document(
    db: Prisma,
    customer_id: str,
    document_id: str,
) -> dict[str, Any]:
    """
    Fetch a single document, scoped to the calling customer. Used by the
    customer-side OCR poll endpoint (GET /v1/customers/me/documents/{id}).
    """
    doc = await db.document.find_unique(where={"id": document_id})
    if doc is None or doc.customerId != customer_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return _serialise_document(doc)
