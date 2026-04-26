"""Tests for the /v1/payments endpoints."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from origin_backend.auth.jwt import issue_access_token

CUSTOMER_ID = "cust-1"


def _customer() -> SimpleNamespace:
    return SimpleNamespace(
        id=CUSTOMER_ID,
        phone="+971501234567",
        email=None,
        fullName="Amr",
        kycStatus=SimpleNamespace(value="PENDING"),
        preferredLanguage=SimpleNamespace(value="en"),
    )


def _customer_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=CUSTOMER_ID, role='customer')}"}


@pytest.fixture
def stripe_create(monkeypatch):
    """Replace stripe_payments.create_payment_intent with an AsyncMock."""
    from origin_backend.integrations import stripe_payments

    fake = AsyncMock(return_value={"clientSecret": "cs_test_xyz", "paymentIntentId": "pi_test_123"})
    monkeypatch.setattr(stripe_payments, "create_payment_intent", fake)
    return fake


# ── Auth gating ────────────────────────────────────────────────────────


def test_create_intent_requires_auth(client: TestClient):
    r = client.post("/v1/payments/create-intent", json={"amountAed": 100})
    assert r.status_code == 401


# ── Validation ─────────────────────────────────────────────────────────


def test_create_intent_rejects_missing_amount(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post("/v1/payments/create-intent", headers=_customer_headers(), json={})
    assert r.status_code == 400


def test_create_intent_rejects_zero_amount(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"amountAed": 0},
    )
    assert r.status_code == 400


def test_create_intent_rejects_too_large(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"amountAed": 600_000},
    )
    assert r.status_code == 400


def test_create_intent_rejects_unknown_field(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"amountAed": 100, "userIsAdmin": True},
    )
    assert r.status_code == 400


# ── Happy paths ────────────────────────────────────────────────────────


def test_create_intent_minimal(client: TestClient, mock_prisma: MagicMock, stripe_create):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"amountAed": 1500},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["clientSecret"] == "cs_test_xyz"
    assert body["paymentIntentId"] == "pi_test_123"

    # Stripe wrapper got the AED amount + empty metadata (no optional fields)
    args = stripe_create.call_args.args
    assert args[0] == 1500
    assert args[1] == {}


def test_create_intent_passes_metadata(client: TestClient, mock_prisma: MagicMock, stripe_create):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={
            "amountAed": 1000,
            "bookingRef": "BK-2026-AAAA1111",
            "serviceType": "RENT",
            "vehicleName": "BYD Atto 3",
        },
    )
    assert r.status_code == 200
    metadata = stripe_create.call_args.args[1]
    assert metadata == {
        "bookingRef": "BK-2026-AAAA1111",
        "serviceType": "RENT",
        "vehicleName": "BYD Atto 3",
    }


def test_create_intent_returns_503_when_stripe_unconfigured(
    client: TestClient, mock_prisma: MagicMock, monkeypatch
):
    """If Stripe is not configured, surface a clear 503 (not a 500)."""
    from origin_backend.integrations import stripe_payments

    async def boom(*args, **kwargs):
        raise RuntimeError("Stripe is not configured")

    monkeypatch.setattr(stripe_payments, "create_payment_intent", boom)
    mock_prisma.customer.find_unique.return_value = _customer()

    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"amountAed": 100},
    )
    assert r.status_code == 503
    assert "not configured" in r.json()["message"].lower()
