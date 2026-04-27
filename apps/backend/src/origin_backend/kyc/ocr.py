"""
Azure Document Intelligence client wrapper (ADR-0002).

Single source of truth for "given a document URL, return curated OCR fields".
The shape of the result matches `ocrFields` in prisma/schema.prisma so writers
can stuff it straight into the column.

Auth strategy (preference order):
  1. Managed identity, when running on Azure with `azure_doc_intel_endpoint` set
     and `azure_doc_intel_key` empty — this is the prod path.
  2. API key (`azure_doc_intel_key`) — dev/fallback.

Provider abstraction:
  We intentionally keep the surface narrow (one `extract` function returning a
  dict) so swapping providers (Onfido / AWS Textract / GCP Document AI) later
  is a one-file change. The persisted `ocrProvider` column tracks which
  provider produced a given row.

This module is import-safe even when Azure SDKs aren't installed yet — the
Azure imports happen lazily inside `_get_client()`. That keeps test runs and
local dev (without azure-* deps) from breaking.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from origin_backend.config import settings
from origin_backend.customers.schemas import DocumentType

logger = logging.getLogger(__name__)

PROVIDER_ID = "azure-doc-intel"

# Model picks per ADR-0002. Prebuilt-idDocument covers Emirates ID + passport
# natively. UAE driving licence + visa fall back to layout extraction with
# heuristic post-processing until we have ~100 real samples to custom-train on.
_MODEL_BY_DOC_TYPE: dict[DocumentType, str] = {
    DocumentType.EMIRATES_ID: "prebuilt-idDocument",
    DocumentType.PASSPORT: "prebuilt-idDocument",
    DocumentType.DRIVING_LICENCE: "prebuilt-document",
    DocumentType.VISA: "prebuilt-document",
}

# Minimum confidence below which a curated field is dropped (set to None).
# The customer-side pre-fill threshold is configurable via
# settings.kyc_ocr_min_confidence_prefill; this here is the absolute floor
# below which we never persist a field at all.
_FIELD_FLOOR = 0.5


class OcrError(Exception):
    """Raised when Azure DI returns an unrecoverable error or invalid output."""


# ── Public API ───────────────────────────────────────────────────────────


def model_for(doc_type: DocumentType) -> str:
    """Return the Document Intelligence model id for a given document type."""
    return _MODEL_BY_DOC_TYPE.get(doc_type, "prebuilt-document")


async def extract(
    *,
    doc_type: DocumentType,
    file_url: str,
) -> dict[str, Any]:
    """
    Run OCR on the document at `file_url` and return curated fields.

    Returns a dict with shape:
        {
          "documentType": "EMIRATES_ID",
          "modelId": "prebuilt-idDocument",
          "fields": { "<key>": {"value": ..., "confidence": 0.0..1.0}, ... },
          "rawDocumentResultPath": "<blob path>" or None,
          "overallConfidence": 0.0..1.0,
        }

    Raises `OcrError` on unrecoverable errors. Caller is responsible for retry
    / failure-marking.

    The `confidence` per field is the per-field confidence from Azure DI; the
    `overallConfidence` is the mean of populated-field confidences.
    """
    if not settings.kyc_ocr_configured:
        raise OcrError("KYC OCR is not configured (KYC_OCR_ENABLED=false or no endpoint)")

    model_id = model_for(doc_type)
    client = _get_client()

    # The DI Python SDK is sync-blocking; we run in a thread pool so we don't
    # block the event loop. Sufficient at V1 volumes (<200/day).
    poller = await asyncio.to_thread(
        client.begin_analyze_document,
        model_id=model_id,
        analyze_request={"urlSource": file_url},
    )
    result = await asyncio.to_thread(poller.result)

    return _curate(doc_type=doc_type, model_id=model_id, raw=result)


# ── Internals ────────────────────────────────────────────────────────────


def _get_client() -> Any:
    """
    Lazy-import the Azure SDK and build a DocumentIntelligenceClient.

    Lazy because:
      - Tests mock this function; they don't need azure-* installed.
      - The KYC OCR feature flag may be off in some environments — we
        shouldn't fail at import time just because the deps aren't there.
    """
    if not settings.azure_doc_intel_endpoint:
        raise OcrError("AZURE_DOC_INTEL_ENDPOINT is not set")

    try:
        from azure.ai.documentintelligence import DocumentIntelligenceClient
        from azure.core.credentials import AzureKeyCredential
    except ImportError as e:  # pragma: no cover — covered manually in dev
        raise OcrError(
            "azure-ai-documentintelligence is not installed. Add to pyproject.toml dependencies."
        ) from e

    if settings.azure_doc_intel_key:
        cred = AzureKeyCredential(settings.azure_doc_intel_key)
    else:
        # Managed-identity path — preferred in prod.
        try:
            from azure.identity import DefaultAzureCredential
        except ImportError as e:  # pragma: no cover
            raise OcrError("azure-identity is not installed but no DI key was provided") from e
        cred = DefaultAzureCredential()

    return DocumentIntelligenceClient(
        endpoint=settings.azure_doc_intel_endpoint,
        credential=cred,
    )


def _curate(
    *,
    doc_type: DocumentType,
    model_id: str,
    raw: Any,
) -> dict[str, Any]:
    """
    Reduce the raw Azure DI response to the curated `ocrFields` shape stored
    on the Document row. Per-document-type field maps live below.
    """
    if doc_type in (DocumentType.EMIRATES_ID, DocumentType.PASSPORT):
        fields = _curate_id_document(raw)
    elif doc_type == DocumentType.DRIVING_LICENCE:
        fields = _curate_driving_licence(raw)
    else:  # VISA
        fields = _curate_visa(raw)

    confidences = [
        f["confidence"]
        for f in fields.values()
        if isinstance(f, dict) and f.get("confidence") is not None
    ]
    overall = sum(confidences) / len(confidences) if confidences else 0.0

    return {
        "documentType": doc_type.value,
        "modelId": model_id,
        "fields": fields,
        "rawDocumentResultPath": None,  # Set by service.py when raw is persisted to blob
        "overallConfidence": round(overall, 4),
    }


def _curate_id_document(raw: Any) -> dict[str, Any]:
    """Map prebuilt-idDocument output (Emirates ID, passport)."""
    docs = _safe_list(raw, "documents")
    if not docs:
        return {}
    fields_raw = getattr(docs[0], "fields", None) or {}
    return _pick(
        fields_raw,
        {
            "firstName": "FirstName",
            "lastName": "LastName",
            "documentNumber": "DocumentNumber",
            "dateOfBirth": "DateOfBirth",
            "dateOfExpiration": "DateOfExpiration",
            "nationality": "Nationality",
            "sex": "Sex",
            "countryRegion": "CountryRegion",
            "machineReadableZone": "MachineReadableZone",
        },
    )


def _curate_driving_licence(raw: Any) -> dict[str, Any]:
    """
    UAE driving licence using prebuilt-document layout extraction.

    Heuristic field-name matching against the KV pairs DI extracts. V1.1
    will replace this with a custom-trained model once we have ~100 real
    samples in `kyc-documents/`.
    """
    kv_pairs = _safe_list(raw, "key_value_pairs")
    out: dict[str, Any] = {}

    for pair in kv_pairs:
        key_text = (
            getattr(getattr(pair, "key", None), "content", "") or ""
        ).strip().lower()
        val = getattr(pair, "value", None)
        val_text = (getattr(val, "content", "") or "").strip()
        confidence = float(getattr(pair, "confidence", 0.0) or 0.0)

        if not val_text:
            continue

        target_field: str | None = None
        if any(t in key_text for t in ("licence no", "license no", "licence number", "license number")):
            target_field = "licenceNumber"
        elif "date of birth" in key_text or "dob" in key_text:
            target_field = "dateOfBirth"
        elif "issue date" in key_text or "date of issue" in key_text:
            target_field = "issueDate"
        elif "expiry" in key_text or "expiration" in key_text:
            target_field = "expiryDate"
        elif "place of issue" in key_text or "issued at" in key_text:
            target_field = "placeOfIssue"
        elif key_text.startswith("name") or key_text in {"full name", "holder", "holder name"}:
            target_field = "fullName"

        if target_field and target_field not in out:
            out[target_field] = {"value": val_text, "confidence": confidence}

    return out


def _curate_visa(raw: Any) -> dict[str, Any]:
    """
    UAE visa stickers vary too much for structured extraction in V1.
    We dump raw text + KV pairs and let the admin verify manually.
    """
    return {
        "rawText": {
            "value": getattr(raw, "content", "") or "",
            "confidence": 1.0,
        },
        "keyValuePairs": [
            {
                "key": (getattr(getattr(pair, "key", None), "content", "") or "").strip(),
                "value": (getattr(getattr(pair, "value", None), "content", "") or "").strip(),
                "confidence": float(getattr(pair, "confidence", 0.0) or 0.0),
            }
            for pair in _safe_list(raw, "key_value_pairs")
        ],
    }


# ── Helpers ────────────────────────────────────────────────────────────


def _safe_list(obj: Any, attr: str) -> list[Any]:
    """Return obj.attr as a list, or [] if missing/None. Defensive against SDK shape drift."""
    val = getattr(obj, attr, None)
    if val is None:
        return []
    return list(val)


def _pick(
    fields_raw: dict[str, Any],
    mapping: dict[str, str],
) -> dict[str, Any]:
    """
    Walk `mapping` (curated_name -> di_field_name) and produce the curated
    `{value, confidence}` dict. Drops fields below `_FIELD_FLOOR` confidence.
    """
    out: dict[str, Any] = {}
    for curated, di_name in mapping.items():
        di_field = fields_raw.get(di_name)
        if di_field is None:
            continue
        value = getattr(di_field, "value_string", None) or getattr(di_field, "value", None)
        confidence = float(getattr(di_field, "confidence", 0.0) or 0.0)
        if value is None or confidence < _FIELD_FLOOR:
            continue
        # Coerce datetime-ish values (DOB, expiry) to ISO strings.
        if hasattr(value, "isoformat"):
            value = value.isoformat() if callable(value.isoformat) else str(value)
        out[curated] = {"value": str(value), "confidence": round(confidence, 4)}
    return out
