"""
Tests for the /v1/customers endpoints.

These run against a mocked Prisma client. We mint a real JWT for a fake
customer so the auth dependency resolves, then assert on Prisma call
shapes and response bodies. No network, no DB.
"""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from origin_backend.auth.jwt import issue_access_token

CUSTOMER_ID = "cust-1"


def _customer(**overrides: object) -> SimpleNamespace:
    data: dict[str, object] = {
        "id": CUSTOMER_ID,
        "phone": "+971501234567",
        "email": None,
        "fullName": "Amr Hassan",
        "nationality": None,
        "preferredLanguage": SimpleNamespace(value="en"),
        "kycStatus": SimpleNamespace(value="PENDING"),
        "kycRejectionReason": None,
        "whatsappOptIn": False,
        "documents": [],
        "createdAt": datetime(2026, 4, 25, 12, 0, tzinfo=UTC),
        "updatedAt": datetime(2026, 4, 25, 12, 0, tzinfo=UTC),
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def _document(
    *,
    doc_id: str = "doc-1",
    type_: str = "EMIRATES_ID",
    file_url: str = "https://storage.test/eid.pdf",
    status: str = "PENDING",
    expiry: datetime | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=doc_id,
        customerId=CUSTOMER_ID,
        type=SimpleNamespace(value=type_),
        fileUrl=file_url,
        expiryDate=expiry,
        status=SimpleNamespace(value=status),
        rejectionReason=None,
        uploadedAt=datetime(2026, 4, 25, 12, 0, tzinfo=UTC),
        reviewedAt=None,
        reviewedBy=None,
    )


def _customer_auth_headers() -> dict[str, str]:
    token = issue_access_token(sub=CUSTOMER_ID, role="customer")
    return {"Authorization": f"Bearer {token}"}


def _admin_auth_headers() -> dict[str, str]:
    token = issue_access_token(sub="admin-1", role="SUPER_ADMIN")
    return {"Authorization": f"Bearer {token}"}


# ── Auth gating ────────────────────────────────────────────────────────


def test_get_me_requires_auth(client: TestClient):
    r = client.get("/v1/customers/me")
    assert r.status_code == 401


def test_get_me_rejects_admin_token(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.adminuser.find_unique.return_value = SimpleNamespace(
        id="admin-1",
        email="a@b.co",
        fullName="A",
        role=SimpleNamespace(value="SUPER_ADMIN"),
        isActive=True,
    )
    r = client.get("/v1/customers/me", headers=_admin_auth_headers())
    assert r.status_code == 403


def test_get_me_rejects_unknown_customer(client: TestClient, mock_prisma: MagicMock):
    """Token says customer cust-1 but the DB returns None — 401."""
    mock_prisma.customer.find_unique.return_value = None
    r = client.get("/v1/customers/me", headers=_customer_auth_headers())
    assert r.status_code == 401


# ── GET /customers/me ──────────────────────────────────────────────────


def test_get_me_returns_profile_with_documents(client: TestClient, mock_prisma: MagicMock):
    customer = _customer(documents=[_document()])
    # require_customer hits find_unique once (no include); service.get_profile hits it again with include.
    mock_prisma.customer.find_unique.side_effect = [_customer(), customer]

    r = client.get("/v1/customers/me", headers=_customer_auth_headers())
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == CUSTOMER_ID
    assert body["fullName"] == "Amr Hassan"
    assert body["kycStatus"] == "PENDING"
    assert len(body["documents"]) == 1
    assert body["documents"][0]["type"] == "EMIRATES_ID"

    # Last call (the service one) must include documents ordered desc.
    last_call = mock_prisma.customer.find_unique.call_args_list[-1]
    assert last_call.kwargs["include"]["documents"]["order_by"] == {"uploadedAt": "desc"}


# ── PATCH /customers/me ────────────────────────────────────────────────


def test_patch_me_updates_only_provided_fields(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.customer.update.return_value = _customer(fullName="New Name")

    r = client.patch(
        "/v1/customers/me",
        headers=_customer_auth_headers(),
        json={"fullName": "New Name", "whatsappOptIn": True},
    )
    assert r.status_code == 200
    assert r.json()["fullName"] == "New Name"

    update_call = mock_prisma.customer.update.call_args
    assert update_call.kwargs["where"] == {"id": CUSTOMER_ID}
    # email and preferredLanguage were not sent — must not appear in data
    assert update_call.kwargs["data"] == {"fullName": "New Name", "whatsappOptIn": True}


def test_patch_me_rejects_invalid_email(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.patch(
        "/v1/customers/me",
        headers=_customer_auth_headers(),
        json={"email": "not-an-email"},
    )
    assert r.status_code == 400


def test_patch_me_rejects_unknown_field(client: TestClient, mock_prisma: MagicMock):
    """`extra=forbid` means stray fields are a 400, not silent."""
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.patch(
        "/v1/customers/me",
        headers=_customer_auth_headers(),
        json={"isAdmin": True},
    )
    assert r.status_code == 400


def test_patch_me_empty_body_returns_existing(client: TestClient, mock_prisma: MagicMock):
    """No fields to update — service returns the existing record without calling update()."""
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.patch("/v1/customers/me", headers=_customer_auth_headers(), json={})
    assert r.status_code == 200
    mock_prisma.customer.update.assert_not_awaited()


# ── GET /customers/me/documents ────────────────────────────────────────


def test_list_documents(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.document.find_many.return_value = [
        _document(doc_id="d1", type_="EMIRATES_ID"),
        _document(doc_id="d2", type_="PASSPORT"),
    ]

    r = client.get("/v1/customers/me/documents", headers=_customer_auth_headers())
    assert r.status_code == 200
    body = r.json()
    assert [d["id"] for d in body] == ["d1", "d2"]

    kwargs = mock_prisma.document.find_many.call_args.kwargs
    assert kwargs["where"] == {"customerId": CUSTOMER_ID}
    assert kwargs["order"] == {"uploadedAt": "desc"}


# ── POST /customers/me/documents ───────────────────────────────────────


def test_post_document_creates_when_none_exists(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.document.find_first.return_value = None
    created = _document(doc_id="new-1")
    mock_prisma.document.create.return_value = created
    mock_prisma.document.count.return_value = 1  # only one doc — don't flip kycStatus

    r = client.post(
        "/v1/customers/me/documents",
        headers=_customer_auth_headers(),
        json={
            "type": "EMIRATES_ID",
            "fileUrl": "https://storage.test/eid.pdf",
            "expiryDate": "2027-12-31",
        },
    )
    assert r.status_code == 200
    assert r.json()["id"] == "new-1"

    create_args = mock_prisma.document.create.call_args.kwargs
    assert create_args["data"]["customerId"] == CUSTOMER_ID
    assert create_args["data"]["type"] == "EMIRATES_ID"
    assert create_args["data"]["fileUrl"] == "https://storage.test/eid.pdf"
    assert create_args["data"]["status"] == "PENDING"
    assert create_args["data"]["expiryDate"].year == 2027

    # Only one doc => kycStatus must NOT be updated
    mock_prisma.customer.update.assert_not_awaited()


def test_post_document_updates_when_same_type_exists(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    existing = _document(doc_id="old-1")
    mock_prisma.document.find_first.return_value = existing
    mock_prisma.document.update.return_value = _document(doc_id="old-1", status="PENDING")

    r = client.post(
        "/v1/customers/me/documents",
        headers=_customer_auth_headers(),
        json={"type": "EMIRATES_ID", "fileUrl": "https://storage.test/new.pdf"},
    )
    assert r.status_code == 200

    update_args = mock_prisma.document.update.call_args.kwargs
    assert update_args["where"] == {"id": "old-1"}
    assert update_args["data"]["fileUrl"] == "https://storage.test/new.pdf"
    assert update_args["data"]["status"] == "PENDING"
    assert update_args["data"]["rejectionReason"] is None
    # No new create on the resubmit path
    mock_prisma.document.create.assert_not_awaited()


def test_post_document_flips_kyc_to_submitted_after_two(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.document.find_first.return_value = None
    mock_prisma.document.create.return_value = _document(doc_id="d2")
    mock_prisma.document.count.return_value = 2

    r = client.post(
        "/v1/customers/me/documents",
        headers=_customer_auth_headers(),
        json={"type": "PASSPORT", "fileUrl": "https://storage.test/passport.pdf"},
    )
    assert r.status_code == 200

    mock_prisma.customer.update.assert_awaited_once()
    update_args = mock_prisma.customer.update.call_args.kwargs
    assert update_args["where"] == {"id": CUSTOMER_ID}
    assert update_args["data"] == {"kycStatus": "SUBMITTED"}


def test_post_document_rejects_invalid_url(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/customers/me/documents",
        headers=_customer_auth_headers(),
        json={"type": "EMIRATES_ID", "fileUrl": "not-a-url"},
    )
    assert r.status_code == 400


def test_post_document_rejects_invalid_type(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/customers/me/documents",
        headers=_customer_auth_headers(),
        json={"type": "BANK_STATEMENT", "fileUrl": "https://storage.test/bank.pdf"},
    )
    assert r.status_code == 400


def test_post_document_rejects_invalid_expiry(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.document.find_first.return_value = None
    r = client.post(
        "/v1/customers/me/documents",
        headers=_customer_auth_headers(),
        json={
            "type": "EMIRATES_ID",
            "fileUrl": "https://storage.test/eid.pdf",
            "expiryDate": "not-a-date",
        },
    )
    assert r.status_code == 400
