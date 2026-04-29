"""Tests for the /v1/payments endpoints."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from origin_backend.auth.jwt import issue_access_token

CUSTOMER_ID = "cust-1"
OTHER_CUSTOMER_ID = "cust-2"
BOOKING_ID = "00000000-0000-0000-0000-000000000001"


def _customer(cid: str = CUSTOMER_ID) -> SimpleNamespace:
    return SimpleNamespace(
        id=cid,
        phone="+971501234567",
        email=None,
        fullName="Amr",
        kycStatus=SimpleNamespace(value="APPROVED"),
        preferredLanguage=SimpleNamespace(value="en"),
    )


def _booking(
    *,
    deposit: str = "1500.00",
    customer_id: str = CUSTOMER_ID,
    deposit_paid: bool = False,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=BOOKING_ID,
        reference="BK-2026-AAAA1111",
        customerId=customer_id,
        depositAmountAed=Decimal(deposit),
        depositPaid=deposit_paid,
        vehicle=SimpleNamespace(brand="BYD", model="Atto 3"),
    )


def _customer_headers(cid: str = CUSTOMER_ID) -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=cid, role='customer')}"}


@pytest.fixture
def stripe_create(monkeypatch):
    """Replace stripe_payments.create_payment_intent with an AsyncMock."""
    from origin_backend.integrations import stripe_payments

    fake = AsyncMock(return_value={"clientSecret": "cs_test_xyz", "paymentIntentId": "pi_test_123"})
    monkeypatch.setattr(stripe_payments, "create_payment_intent", fake)
    return fake


# ── Auth gating ────────────────────────────────────────────────────────


def test_create_intent_requires_auth(client: TestClient):
    r = client.post("/v1/payments/create-intent", json={"bookingId": BOOKING_ID})
    assert r.status_code == 401


# ── Schema validation ──────────────────────────────────────────────────


def test_create_intent_rejects_missing_booking_id(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post("/v1/payments/create-intent", headers=_customer_headers(), json={})
    assert r.status_code == 400


def test_create_intent_rejects_legacy_amount_field(client: TestClient, mock_prisma: MagicMock):
    """Client-controlled `amountAed` is no longer accepted (#128)."""
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"bookingId": BOOKING_ID, "amountAed": 1},
    )
    assert r.status_code == 400


# ── #128 security: amount is server-derived; cross-tenant + idempotency ─


def test_create_intent_404_when_booking_missing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = None
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"bookingId": BOOKING_ID},
    )
    assert r.status_code == 404


def test_create_intent_403_for_cross_tenant_booking(client: TestClient, mock_prisma: MagicMock):
    """Customer A cannot pay for customer B's booking (#128)."""
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking(customer_id=OTHER_CUSTOMER_ID)
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"bookingId": BOOKING_ID},
    )
    assert r.status_code == 403


def test_create_intent_409_when_deposit_already_paid(client: TestClient, mock_prisma: MagicMock):
    """Pay twice → 409 (idempotency, prevents double-charging)."""
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking(deposit_paid=True)
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"bookingId": BOOKING_ID},
    )
    assert r.status_code == 409


def test_create_intent_charges_deposit_plus_vat_from_db(
    client: TestClient, mock_prisma: MagicMock, stripe_create
):
    """The Stripe charge must equal depositAmountAed * 1.05 — derived server-side."""
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking(deposit="1500.00")
    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"bookingId": BOOKING_ID},
    )
    assert r.status_code == 200
    args = stripe_create.call_args.args
    # 1500 * 1.05 = 1575.00 — and crucially, NOT something the client picked.
    assert args[0] == 1575.00
    metadata = args[1]
    assert metadata["bookingId"] == BOOKING_ID
    assert metadata["bookingRef"] == "BK-2026-AAAA1111"
    assert metadata["customerId"] == CUSTOMER_ID
    assert metadata["vehicleName"] == "BYD Atto 3"


def test_create_intent_returns_503_when_stripe_unconfigured(
    client: TestClient, mock_prisma: MagicMock, monkeypatch
):
    """If Stripe is not configured, surface a clear 503 (not a 500)."""
    from origin_backend.integrations import stripe_payments

    async def boom(*args, **kwargs):
        raise RuntimeError("Stripe is not configured")

    monkeypatch.setattr(stripe_payments, "create_payment_intent", boom)
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking()

    r = client.post(
        "/v1/payments/create-intent",
        headers=_customer_headers(),
        json={"bookingId": BOOKING_ID},
    )
    assert r.status_code == 503
    assert "not configured" in r.json()["message"].lower()
