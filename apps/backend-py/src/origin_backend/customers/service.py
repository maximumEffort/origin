"""
Customers business logic.

Mirrors apps/backend/src/customers/customers.service.ts. Functions take
Prisma as an explicit argument (DI via FastAPI Depends in the router) so
they're trivially testable with a mocked client.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

from origin_backend.customers.schemas import DocumentType
from prisma import Prisma


def _enum_value(v: Any) -> str | None:
    """Prisma Python returns enums as Python enum members; coerce to str."""
    if v is None:
        return None
    return v.value if hasattr(v, "value") else str(v)


def _serialise_document(doc: Any) -> dict[str, Any]:
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
) -> dict[str, Any]:
    """
    Register a KYC document. If a document of the same type exists, update
    it (re-submit flow); otherwise create. Once the customer has at least
    two documents, mark their KYC as SUBMITTED for the back-office to review.
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
        }
        if expiry_dt is not None:
            update_data["expiryDate"] = expiry_dt
        updated = await db.document.update(where={"id": existing.id}, data=update_data)
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

    return _serialise_document(doc)
