"""
Tests for the /v1/admin/documents/{id}/{reocr,approve,reject} endpoints
plus the customer-side GET /v1/customers/me/documents/{id} polling path
and the OCR enqueue hook on POST /v1/customers/me/documents.

Follows the same pattern as test_customers_router.py — mocked Prisma
client, real-minted JWTs for auth, no network. The Azure DI client is
patched at the module level so we don't need azure-* installed in the
test environment.
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from origin_backend.auth.jwt import issue_access_token

CUSTOMER_ID = "cust-1"
ADMIN_ID = "admin-1"
DOC_ID = "doc-1"


def _document(
    *,
    doc_id: str = DOC_ID,
    customer_id: str = CUSTOMER_ID,
    type_: str = "EMIRATES_ID",
    file_url: str = "https://storage.test/eid.pdf",
    status: str = "PENDING",
    ocr_status: str = "NOT_STARTED",
    ocr_fields: dict[str, Any] | None = None,
    ocr_confidence: float | None = None,
    expiry: datetime | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=doc_id,
        customerId=customer_id,
        type=SimpleNamespace(value=type_),
        fileUrl=file_url,
        expiryDate=expiry,
        status=SimpleNamespace(value=status),
        rejectionReason=None,
        uploadedAt=datetime(2026, 4, 26, 12, 0, tzinfo=UTC),
        reviewedAt=None,
        reviewedBy=None,
        ocrStatus=SimpleNamespace(value=ocr_status),
        ocrProvider=None,
        ocrModel=None,
        ocrFields=ocr_fields,
        ocrConfidence=ocr_confidence,
        ocrRequestedAt=None,
        ocrCompletedAt=None,
        ocrFailureReason=None,
        reviewerOverrides=None,
    )


def _customer_headers(customer_id: str = CUSTOMER_ID) -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=customer_id, role='customer')}"}


def _admin_headers(admin_id: str = ADMIN_ID, role: str = "SUPER_ADMIN") -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=admin_id, role=role)}"}


def _admin_user(admin_id: str = ADMIN_ID, role: str = "SUPER_ADMIN") -> SimpleNamespace:
    return SimpleNamespace(
        id=admin_id,
        email="ops@origin-auto.ae",
        fullName="Ops",
        role=SimpleNamespace(value=role),
        isActive=True,
    )


def _customer_user(customer_id: str = CUSTOMER_ID) -> SimpleNamespace:
    return SimpleNamespace(
        id=customer_id,
        phone="+971501234567",
        email=None,
        fullName="Amr",
        nationality=None,
        preferredLanguage=SimpleNamespace(value="en"),
        kycStatus=SimpleNamespace(value="PENDING"),
        kycRejectionReason=None,
        whatsappOptIn=False,
        documents=[],
        createdAt=datetime(2026, 4, 26, 12, 0, tzinfo=UTC),
        updatedAt=datetime(2026, 4, 26, 12, 0, tzinfo=UTC),
    )


# ────────────────────────────────────────────────────────────────────
# Customer-side: GET /v1/customers/me/documents/{id}
# ────────────────────────────────────────────────────────────────────


def test_get_my_document_returns_document_with_ocr_fields(
    client: TestClient, mock_prisma: MagicMock
):
    """Happy path — customer polls a doc, gets OCR-enriched response."""
    mock_prisma.customer.find_unique.return_value = _customer_user()
    mock_prisma.document.find_unique.return_value = _document(
        ocr_status="COMPLETED",
        ocr_fields={"firstName": {"value": "Amr", "confidence": 0.98}},
        ocr_confidence=0.96,
    )
    r = client.get(f"/v1/customers/me/documents/{DOC_ID}", headers=_customer_headers())
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == DOC_ID
    assert body["ocrStatus"] == "COMPLETED"
    assert body["ocrFields"]["firstName"]["value"] == "Amr"
    assert body["ocrConfidence"] == 0.96


def test_get_my_document_404_when_not_found(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer_user()
    mock_prisma.document.find_unique.return_value = None
    r = client.get(f"/v1/customers/me/documents/{DOC_ID}", headers=_customer_headers())
    assert r.status_code == 404


def test_get_my_document_404_on_cross_tenant_access(client: TestClient, mock_prisma: MagicMock):
    """A customer asking for someone else's doc gets 404 (not 403, to avoid
    leaking existence)."""
    mock_prisma.customer.find_unique.return_value = _customer_user()
    mock_prisma.document.find_unique.return_value = _document(customer_id="someone-else")
    r = client.get(f"/v1/customers/me/documents/{DOC_ID}", headers=_customer_headers())
    assert r.status_code == 404


# ────────────────────────────────────────────────────────────────────
# OCR enqueue hook on POST /v1/customers/me/documents
# ────────────────────────────────────────────────────────────────────


def test_add_document_enqueues_ocr_when_flag_on(
    client: TestClient, mock_prisma: MagicMock, monkeypatch
):
    """When KYC_OCR_ENABLED is true and Azure DI endpoint is set, uploading
    a supported doc type schedules a background task."""
    from origin_backend.config import settings as live_settings

    monkeypatch.setattr(live_settings, "kyc_ocr_enabled", True)
    monkeypatch.setattr(
        live_settings,
        "azure_doc_intel_endpoint",
        "https://di-origin-test.cognitiveservices.azure.com/",
    )
    mock_prisma.customer.find_unique.return_value = _customer_user()
    mock_prisma.document.find_first.return_value = None
    mock_prisma.document.create.return_value = _document()
    mock_prisma.document.count.return_value = 1

    with patch("origin_backend.kyc.service.schedule_ocr_if_enabled") as mock_schedule:
        r = client.post(
            "/v1/customers/me/documents",
            headers=_customer_headers(),
            json={
                "type": "EMIRATES_ID",
                "fileUrl": "https://storage.test/eid.pdf",
            },
        )
    assert r.status_code == 200
    mock_schedule.assert_called_once()
    kwargs = mock_schedule.call_args.kwargs
    assert kwargs["doc_type"] == "EMIRATES_ID"
    assert kwargs["file_url"] == "https://storage.test/eid.pdf"


def test_add_document_no_op_when_flag_off(client: TestClient, mock_prisma: MagicMock, monkeypatch):
    """With the feature flag off, schedule_ocr_if_enabled is still called
    but it short-circuits internally — verified at the function level
    elsewhere; here we just confirm the upload still succeeds."""
    from origin_backend.config import settings as live_settings

    monkeypatch.setattr(live_settings, "kyc_ocr_enabled", False)
    mock_prisma.customer.find_unique.return_value = _customer_user()
    mock_prisma.document.find_first.return_value = None
    mock_prisma.document.create.return_value = _document()
    mock_prisma.document.count.return_value = 1

    r = client.post(
        "/v1/customers/me/documents",
        headers=_customer_headers(),
        json={
            "type": "EMIRATES_ID",
            "fileUrl": "https://storage.test/eid.pdf",
        },
    )
    assert r.status_code == 200
    assert r.json()["ocrStatus"] == "NOT_STARTED"


# ────────────────────────────────────────────────────────────────────
# Admin: POST /v1/admin/documents/{id}/reocr
# ────────────────────────────────────────────────────────────────────


def test_reocr_requires_admin(client: TestClient):
    r = client.post(f"/v1/admin/documents/{DOC_ID}/reocr")
    assert r.status_code == 401


def test_kyc_admin_allows_sales(client: TestClient, mock_prisma: MagicMock):
    """KYC is a SALES function — SALES role must be allowed on review endpoints."""
    mock_prisma.adminuser.find_unique.return_value = _admin_user(role="SALES")
    mock_prisma.document.find_unique.return_value = _document()
    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/reocr",
        headers=_admin_headers(role="SALES"),
    )
    assert r.status_code == 200


def test_kyc_admin_rejects_fleet_manager(client: TestClient, mock_prisma: MagicMock):
    """FLEET_MANAGER is fleet-only and must NOT be able to review KYC docs (#131)."""
    mock_prisma.adminuser.find_unique.return_value = _admin_user(role="FLEET_MANAGER")
    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/reocr",
        headers=_admin_headers(role="FLEET_MANAGER"),
    )
    assert r.status_code == 403
    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/approve",
        headers=_admin_headers(role="FLEET_MANAGER"),
        json={},
    )
    assert r.status_code == 403
    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/reject",
        headers=_admin_headers(role="FLEET_MANAGER"),
        json={"reason": "blurry"},
    )
    assert r.status_code == 403


def test_reocr_returns_processing_state(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin_user()
    mock_prisma.document.find_unique.return_value = _document()
    r = client.post(f"/v1/admin/documents/{DOC_ID}/reocr", headers=_admin_headers())
    assert r.status_code == 200
    body = r.json()
    assert body["documentId"] == DOC_ID
    assert body["ocrStatus"] == "PROCESSING"


def test_reocr_404_when_doc_missing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin_user()
    mock_prisma.document.find_unique.return_value = None
    r = client.post(f"/v1/admin/documents/{DOC_ID}/reocr", headers=_admin_headers())
    assert r.status_code == 404


def test_reocr_400_for_visa_type(client: TestClient, mock_prisma: MagicMock):
    """V1 doesn't OCR visa stickers — re-trigger should 400."""
    mock_prisma.adminuser.find_unique.return_value = _admin_user()
    mock_prisma.document.find_unique.return_value = _document(type_="VISA")
    r = client.post(f"/v1/admin/documents/{DOC_ID}/reocr", headers=_admin_headers())
    assert r.status_code == 400


# ────────────────────────────────────────────────────────────────────
# Admin: POST /v1/admin/documents/{id}/approve
# ────────────────────────────────────────────────────────────────────


def test_approve_with_no_overrides(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin_user()
    mock_prisma.document.find_unique.return_value = _document()
    mock_prisma.document.update.return_value = _document(status="APPROVED")
    mock_prisma.document.find_many.return_value = []  # no other approved docs

    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/approve",
        headers=_admin_headers(),
        json={},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "APPROVED"
    assert body["overridesCount"] == 0
    assert body["reviewedBy"] == ADMIN_ID

    # reviewerOverrides is None (admin accepted as-is).
    update_call = mock_prisma.document.update.call_args
    assert update_call.kwargs["data"]["reviewerOverrides"] is None


def test_approve_with_overrides_persists_them(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin_user()
    mock_prisma.document.find_unique.return_value = _document()
    mock_prisma.document.update.return_value = _document(status="APPROVED")
    mock_prisma.document.find_many.return_value = []

    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/approve",
        headers=_admin_headers(),
        json={"overrides": {"dateOfExpiration": "2027-04-30"}},
    )
    assert r.status_code == 200
    assert r.json()["overridesCount"] == 1

    update_call = mock_prisma.document.update.call_args
    assert update_call.kwargs["data"]["reviewerOverrides"] == {
        "dateOfExpiration": "2027-04-30",
    }


def test_approve_promotes_kyc_when_eid_and_dl_approved(client: TestClient, mock_prisma: MagicMock):
    """After approving an Emirates ID, if a DL is already approved, the
    customer's kycStatus flips to APPROVED."""
    mock_prisma.adminuser.find_unique.return_value = _admin_user()
    mock_prisma.document.find_unique.return_value = _document(type_="EMIRATES_ID")
    mock_prisma.document.update.return_value = _document(type_="EMIRATES_ID", status="APPROVED")
    # find_many returns the freshly-approved EID + an already-approved DL.
    mock_prisma.document.find_many.return_value = [
        SimpleNamespace(type=SimpleNamespace(value="EMIRATES_ID")),
        SimpleNamespace(type=SimpleNamespace(value="DRIVING_LICENCE")),
    ]

    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/approve",
        headers=_admin_headers(),
        json={},
    )
    assert r.status_code == 200
    mock_prisma.customer.update.assert_called_once()
    args = mock_prisma.customer.update.call_args
    assert args.kwargs["data"]["kycStatus"] == "APPROVED"


# ────────────────────────────────────────────────────────────────────
# Admin: POST /v1/admin/documents/{id}/reject
# ────────────────────────────────────────────────────────────────────


def test_reject_requires_reason(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin_user()
    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/reject",
        headers=_admin_headers(),
        json={},  # missing reason
    )
    assert r.status_code == 422


def test_reject_with_reason(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = _admin_user()
    mock_prisma.document.find_unique.return_value = _document()
    mock_prisma.document.update.return_value = _document(status="REJECTED")

    r = client.post(
        f"/v1/admin/documents/{DOC_ID}/reject",
        headers=_admin_headers(),
        json={"reason": "Image is too blurry to read the ID number"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "REJECTED"
    assert body["rejectionReason"] == "Image is too blurry to read the ID number"

    update_call = mock_prisma.document.update.call_args
    assert update_call.kwargs["data"]["status"] == "REJECTED"
    assert (
        update_call.kwargs["data"]["rejectionReason"] == "Image is too blurry to read the ID number"
    )


# ────────────────────────────────────────────────────────────────────
# OCR client unit tests (pure logic, no FastAPI)
# ────────────────────────────────────────────────────────────────────


def test_model_for_emirates_id():
    from origin_backend.customers.schemas import DocumentType
    from origin_backend.kyc.ocr import model_for

    assert model_for(DocumentType.EMIRATES_ID) == "prebuilt-idDocument"
    assert model_for(DocumentType.PASSPORT) == "prebuilt-idDocument"
    assert model_for(DocumentType.DRIVING_LICENCE) == "prebuilt-document"
    assert model_for(DocumentType.VISA) == "prebuilt-document"


def test_curate_id_document_drops_low_confidence_fields():
    """Fields below the _FIELD_FLOOR threshold are dropped, not persisted as
    low-confidence noise."""
    from origin_backend.customers.schemas import DocumentType
    from origin_backend.kyc.ocr import _curate

    # Synthesize a fake DI response. Each field has .value_string + .confidence.
    def fake_field(v, c):
        return SimpleNamespace(value_string=v, value=v, confidence=c)

    fake_doc = SimpleNamespace(
        fields={
            "FirstName": fake_field("Amr", 0.98),
            "LastName": fake_field("Sarhan", 0.95),
            "DocumentNumber": fake_field("784-1990-1234567-8", 0.99),
            "DateOfBirth": fake_field("1990-05-12", 0.99),
            "Nationality": fake_field("EGY", 0.30),  # below floor — should drop
        }
    )
    raw = SimpleNamespace(documents=[fake_doc])

    out = _curate(
        doc_type=DocumentType.EMIRATES_ID,
        model_id="prebuilt-idDocument",
        raw=raw,
    )
    assert "firstName" in out["fields"]
    assert "documentNumber" in out["fields"]
    assert "nationality" not in out["fields"]  # dropped — confidence < 0.5
    # Overall confidence is the mean of populated fields.
    assert 0.9 < out["overallConfidence"] <= 1.0


def test_extract_raises_when_not_configured(monkeypatch):
    """Calling extract() without KYC_OCR_ENABLED raises OcrError, not silently
    fall through to a half-configured Azure call."""
    import asyncio

    from origin_backend.config import settings as live_settings
    from origin_backend.customers.schemas import DocumentType
    from origin_backend.kyc.ocr import OcrError, extract

    monkeypatch.setattr(live_settings, "kyc_ocr_enabled", False)

    async def _run():
        try:
            await extract(doc_type=DocumentType.EMIRATES_ID, file_url="https://x/y")
        except OcrError as e:
            return str(e)
        return "should-have-raised"

    msg = asyncio.run(_run())
    assert "not configured" in msg.lower()
