"""
Pydantic schemas for the customers API.

Mirrors apps/backend/src/customers/dto/* and the response shapes returned
by CustomersService in the NestJS backend.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl


class Language(StrEnum):
    en = "en"
    ar = "ar"
    zh = "zh"


class DocumentType(StrEnum):
    EMIRATES_ID = "EMIRATES_ID"
    DRIVING_LICENCE = "DRIVING_LICENCE"
    VISA = "VISA"
    PASSPORT = "PASSPORT"


# ── Request schemas ──────────────────────────────────────────────


class UpdateCustomerRequest(BaseModel):
    full_name: str | None = Field(default=None, alias="fullName", min_length=1, max_length=200)
    email: EmailStr | None = None
    preferred_language: Language | None = Field(default=None, alias="preferredLanguage")
    whatsapp_opt_in: bool | None = Field(default=None, alias="whatsappOptIn")

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


class CreateDocumentRequest(BaseModel):
    type: DocumentType
    file_url: HttpUrl = Field(..., alias="fileUrl")
    expiry_date: str | None = Field(
        default=None,
        alias="expiryDate",
        description="ISO-8601 date or datetime string",
    )

    model_config = ConfigDict(populate_by_name=True, extra="forbid")


# ── Response schemas ─────────────────────────────────────────────


class DocumentResponse(BaseModel):
    id: str
    customerId: str
    type: str
    fileUrl: str
    expiryDate: datetime | None = None
    status: str
    rejectionReason: str | None = None
    uploadedAt: datetime
    reviewedAt: datetime | None = None
    reviewedBy: str | None = None


class CustomerProfile(BaseModel):
    id: str
    phone: str
    email: str | None = None
    fullName: str
    nationality: str | None = None
    preferredLanguage: str
    kycStatus: str
    kycRejectionReason: str | None = None
    whatsappOptIn: bool
    documents: list[DocumentResponse] = []
    createdAt: datetime
    updatedAt: datetime


class CustomerSummary(BaseModel):
    """Returned by PATCH /customers/me — no documents include."""

    id: str
    phone: str
    email: str | None = None
    fullName: str
    nationality: str | None = None
    preferredLanguage: str
    kycStatus: str
    kycRejectionReason: str | None = None
    whatsappOptIn: bool
    createdAt: datetime
    updatedAt: datetime
