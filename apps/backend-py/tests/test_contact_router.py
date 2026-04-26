"""Tests for the /v1/contact endpoint."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient


def _inquiry(inquiry_id: str = "inq-1") -> SimpleNamespace:
    return SimpleNamespace(id=inquiry_id)


def test_contact_creates_inquiry(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.contactinquiry.create.return_value = _inquiry("inq-42")

    r = client.post(
        "/v1/contact",
        json={
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+971521439746",
            "subject": "Lease inquiry",
            "message": "I would like to know more about BYD leasing options.",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body == {"id": "inq-42", "received": True}

    create_args = mock_prisma.contactinquiry.create.call_args.kwargs["data"]
    assert create_args["name"] == "John Doe"
    assert create_args["email"] == "john@example.com"
    assert create_args["phone"] == "+971521439746"
    assert create_args["subject"] == "Lease inquiry"
    assert "BYD" in create_args["message"]


def test_contact_minimum_fields(client: TestClient, mock_prisma: MagicMock):
    """phone + subject are optional."""
    mock_prisma.contactinquiry.create.return_value = _inquiry()

    r = client.post(
        "/v1/contact",
        json={
            "name": "Ali",
            "email": "ali@example.com",
            "message": "Please contact me about a long-term rental.",
        },
    )
    assert r.status_code == 201
    create_args = mock_prisma.contactinquiry.create.call_args.kwargs["data"]
    assert create_args["phone"] is None
    assert create_args["subject"] is None


def test_contact_rejects_missing_name(client: TestClient):
    r = client.post(
        "/v1/contact",
        json={"email": "x@y.co", "message": "longer than ten chars"},
    )
    assert r.status_code == 400


def test_contact_rejects_short_name(client: TestClient):
    r = client.post(
        "/v1/contact",
        json={"name": "A", "email": "x@y.co", "message": "longer than ten chars"},
    )
    assert r.status_code == 400


def test_contact_rejects_invalid_email(client: TestClient):
    r = client.post(
        "/v1/contact",
        json={"name": "Ali", "email": "not-an-email", "message": "longer than ten chars"},
    )
    assert r.status_code == 400


def test_contact_rejects_short_message(client: TestClient):
    r = client.post(
        "/v1/contact",
        json={"name": "Ali", "email": "x@y.co", "message": "short"},
    )
    assert r.status_code == 400


def test_contact_rejects_long_message(client: TestClient):
    r = client.post(
        "/v1/contact",
        json={"name": "Ali", "email": "x@y.co", "message": "x" * 2001},
    )
    assert r.status_code == 400


def test_contact_rejects_unknown_field(client: TestClient, mock_prisma: MagicMock):
    """`extra=forbid` means stray fields are a 400, not silent acceptance."""
    r = client.post(
        "/v1/contact",
        json={
            "name": "Ali",
            "email": "x@y.co",
            "message": "longer than ten chars",
            "isAdmin": True,
        },
    )
    assert r.status_code == 400
    mock_prisma.contactinquiry.create.assert_not_awaited()
