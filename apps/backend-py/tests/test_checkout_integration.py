"""Tests for the Checkout.com integration wrapper + webhook receiver."""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi.testclient import TestClient

from origin_backend.integrations import checkout_com, sendgrid_email

# ── checkout_com helpers ──────────────────────────────────────────────


@pytest.fixture
def configured_checkout(monkeypatch):
    monkeypatch.setattr(checkout_com.settings, "checkout_secret_key", "sk_test")
    monkeypatch.setattr(checkout_com.settings, "checkout_webhook_secret", "wh-secret")


def test_calculate_with_vat():
    out = checkout_com.calculate_with_vat(1000.00)
    assert out == {"base": 1000.0, "vat": 50.0, "total": 1050.0}


def test_verify_webhook_signature_happy(configured_checkout):
    body = b'{"type":"payment_approved"}'
    sig = hmac.new(b"wh-secret", body, hashlib.sha256).hexdigest()
    assert checkout_com.verify_webhook_signature(body, sig) is True


def test_verify_webhook_signature_rejects_wrong_sig(configured_checkout):
    body = b'{"type":"payment_approved"}'
    assert checkout_com.verify_webhook_signature(body, "deadbeef") is False


def test_verify_webhook_signature_rejects_when_unconfigured(monkeypatch):
    monkeypatch.setattr(checkout_com.settings, "checkout_webhook_secret", None)
    body = b'{"type":"payment_approved"}'
    assert checkout_com.verify_webhook_signature(body, "anything") is False


# ── createPaymentSession ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_payment_session_converts_amount_to_fils(configured_checkout, monkeypatch):
    captured: dict[str, object] = {}

    async def fake_post(self, url, json=None, headers=None):
        captured["json"] = json
        captured["headers"] = headers
        return httpx.Response(
            200,
            json={
                "id": "ps_1",
                "expires_on": "2026-04-30T00:00:00Z",
                "_links": {"redirect": {"href": "https://co/pay/abc"}},
            },
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    session = await checkout_com.create_payment_session(
        checkout_com.PaymentSessionRequest(
            amountAed=1500.50,
            reference="BK-1",
            customerName="Amr",
            customerEmail="amr@example.com",
            customerPhone="+971501234567",
            successUrl="https://x/s",
            failureUrl="https://x/f",
            cancelUrl="https://x/c",
            metadata={"booking": "BK-1"},
        )
    )

    assert session.sessionId == "ps_1"
    assert session.paymentUrl == "https://co/pay/abc"
    assert captured["json"]["amount"] == 150050  # 1500.50 × 100
    assert captured["json"]["currency"] == "AED"
    # 3DS must be on for UAE
    assert captured["json"]["3ds"] == {"enabled": True}
    assert captured["headers"]["Authorization"] == "Bearer sk_test"


# ── /v1/webhooks/checkout ─────────────────────────────────────────────


@pytest.fixture
def signed_post(client: TestClient, configured_checkout, monkeypatch):
    """Helper: sign + POST to the webhook endpoint."""
    # Block any real outbound email
    fake_email = AsyncMock()
    monkeypatch.setattr(sendgrid_email, "send_payment_receipt", fake_email)

    def _post(payload: dict, *, signed: bool = True):
        body = json.dumps(payload).encode("utf-8")
        if signed:
            sig = hmac.new(b"wh-secret", body, hashlib.sha256).hexdigest()
        else:
            sig = "deadbeef"
        return client.post(
            "/v1/webhooks/checkout",
            content=body,
            headers={"cko-signature": sig, "Content-Type": "application/json"},
        )

    return _post


def test_webhook_rejects_invalid_signature(signed_post):
    r = signed_post(
        {"type": "payment_approved", "data": {"id": "p1", "reference": "BK-1"}},
        signed=False,
    )
    assert r.status_code == 403


def test_webhook_rejects_missing_signature(client: TestClient, configured_checkout):
    r = client.post(
        "/v1/webhooks/checkout", content=b"{}", headers={"Content-Type": "application/json"}
    )
    assert r.status_code == 403


def test_webhook_payment_approved_marks_payment_paid(signed_post, mock_prisma: MagicMock):
    mock_prisma.payment.update_many.return_value = SimpleNamespace(count=1)
    mock_prisma.payment.find_first.return_value = SimpleNamespace(
        id="pay-1",
        lease=SimpleNamespace(
            customer=SimpleNamespace(
                email=None,  # avoid email path; covered separately
                fullName="Amr",
                preferredLanguage=SimpleNamespace(value="en"),
            )
        ),
    )

    r = signed_post(
        {
            "type": "payment_approved",
            "data": {"id": "p_xyz", "reference": "BK-1", "amount": 105000},
        }
    )
    assert r.status_code == 200
    assert r.json() == {"received": True}

    update_args = mock_prisma.payment.update_many.call_args.kwargs
    assert update_args["where"] == {"gatewayReference": "BK-1", "status": "PENDING"}
    assert update_args["data"]["status"] == "PAID"
    assert update_args["data"]["gateway"] == "CHECKOUT_COM"
    assert isinstance(update_args["data"]["paidAt"], datetime)


def test_webhook_payment_approved_falls_back_to_booking_deposit(
    signed_post, mock_prisma: MagicMock
):
    """When no Payment row matches, mark the booking deposit as paid."""
    mock_prisma.payment.update_many.return_value = SimpleNamespace(count=0)
    mock_prisma.booking.find_unique.return_value = SimpleNamespace(
        id="bk-1",
        customer=SimpleNamespace(
            email=None,
            fullName="Amr",
            preferredLanguage=SimpleNamespace(value="en"),
        ),
    )

    r = signed_post(
        {
            "type": "payment_approved",
            "data": {"id": "p_xyz", "reference": "BK-1", "amount": 105000},
        }
    )
    assert r.status_code == 200
    booking_update = mock_prisma.booking.update.call_args.kwargs
    assert booking_update["where"] == {"id": "bk-1"}
    assert booking_update["data"] == {"depositPaid": True}


def test_webhook_payment_approved_warns_when_no_match(signed_post, mock_prisma: MagicMock):
    """No Payment row + no booking → log + 200 (no DB writes)."""
    mock_prisma.payment.update_many.return_value = SimpleNamespace(count=0)
    mock_prisma.booking.find_unique.return_value = None

    r = signed_post(
        {
            "type": "payment_approved",
            "data": {"id": "p_xyz", "reference": "UNKNOWN", "amount": 100},
        }
    )
    assert r.status_code == 200
    mock_prisma.booking.update.assert_not_awaited()


def test_webhook_payment_declined_marks_overdue(signed_post, mock_prisma: MagicMock):
    mock_prisma.payment.update_many.return_value = SimpleNamespace(count=2)
    r = signed_post(
        {
            "type": "payment_declined",
            "data": {"id": "p_xyz", "reference": "BK-1"},
        }
    )
    assert r.status_code == 200
    update_args = mock_prisma.payment.update_many.call_args.kwargs
    assert update_args["where"] == {"gatewayReference": "BK-1", "status": "PENDING"}
    assert update_args["data"] == {"status": "OVERDUE"}


def test_webhook_payment_refunded_marks_refunded(signed_post, mock_prisma: MagicMock):
    mock_prisma.payment.update_many.return_value = SimpleNamespace(count=1)
    r = signed_post(
        {
            "type": "payment_refunded",
            "data": {"id": "p_xyz", "reference": "BK-1"},
        }
    )
    assert r.status_code == 200
    update_args = mock_prisma.payment.update_many.call_args.kwargs
    assert update_args["where"] == {"gatewayReference": "BK-1", "status": "PAID"}
    assert update_args["data"] == {"status": "REFUNDED"}


def test_webhook_unhandled_event_is_200(signed_post, mock_prisma: MagicMock):
    """Unknown event types are logged but acked so Checkout doesn't retry forever."""
    r = signed_post({"type": "payment_pending", "data": {"id": "x"}})
    assert r.status_code == 200
    mock_prisma.payment.update_many.assert_not_awaited()


def test_webhook_rejects_non_json_body(client: TestClient, configured_checkout):
    body = b"not-json"
    sig = hmac.new(b"wh-secret", body, hashlib.sha256).hexdigest()
    r = client.post(
        "/v1/webhooks/checkout",
        content=body,
        headers={"cko-signature": sig, "Content-Type": "application/json"},
    )
    assert r.status_code == 400
