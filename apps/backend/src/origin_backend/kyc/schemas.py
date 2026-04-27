"""
Pydantic schemas for the KYC OCR endpoints (ADR-0002).

These cover the admin-facing surface (re-trigger OCR, approve, reject) and
the customer-facing single-document poll endpoint that lives on the customers
router but returns the OCR-enriched DocumentResponse defined here.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OcrStatus(StrEnum):
    NOT_STARTED = "NOT_STARTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


# ── Response shapes ─────────────────────────────────────────────────


class DocumentWithOcrResponse(BaseModel):
    """
    Extended Document response that includes OCR fields.

    Used by:
      - GET /v1/customers/me/documents (list)
      - GET /v1/customers/me/documents/{id} (poll)
      - GET /v1/admin/customers/{id}/documents (admin review)

    Backward-compat: existing fields keep their shape; OCR fields are
    nullable so old clients ignoring them are unaffected.
    """

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

    # ── OCR additions ──
    ocrStatus: str = "NOT_STARTED"
    ocrProvider: str | None = None
    ocrModel: str | None = None
    ocrFields: dict[str, Any] | None = None
    ocrConfidence: float | None = None
    ocrRequestedAt: datetime | None = None
    ocrCompletedAt: datetime | None = None
    ocrFailureReason: str | None = None
    reviewerOverrides: dict[str, Any] | None = None


# ── Request shapes ──────────────────────────────────────────────────


class ApproveDocumentRequest(BaseModel):
    """
    Admin approve action.

    `overrides` is a per-field map of {field_name: corrected_value} for cases
    where the admin disagreed with OCR. Stored on the Document row as
    `reviewerOverrides` for audit. None / empty means "OCR accepted as-is".
    """

    overrides: dict[str, str] | None = Field(
        default=None,
        description="Per-field corrections. Field names match ocrFields.fields keys.",
    )

    model_config = ConfigDict(extra="forbid")


class RejectDocumentRequest(BaseModel):
    """Admin reject action — must include a reason for the customer."""

    reason: str = Field(..., min_length=1, max_length=500)

    model_config = ConfigDict(extra="forbid")


class ReocrResponse(BaseModel):
    """Result of POST /admin/documents/{id}/reocr."""

    documentId: str
    ocrStatus: str
    enqueuedAt: datetime


class ApproveResponse(BaseModel):
    documentId: str
    status: str
    reviewedAt: datetime
    reviewedBy: str
    overridesCount: int


class RejectResponse(BaseModel):
    documentId: str
    status: str
    rejectionReason: str
    reviewedAt: datetime
    reviewedBy: str
