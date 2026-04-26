"""
Tests for the SendGrid integration wrapper.

We don't hit the real SendGrid API. Instead we replace `_client()` with
a stub and assert on the Mail object passed to it.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from origin_backend.integrations import sendgrid_email


@pytest.fixture
def stub_client(monkeypatch):
    """Replace the lazy `_client()` with a stub that records sends."""
    fake = MagicMock()
    fake.send = MagicMock(return_value=SimpleNamespace(status_code=202))
    sendgrid_email._client.cache_clear()
    monkeypatch.setattr(sendgrid_email, "_client", lambda: fake)
    return fake


@pytest.fixture
def disabled_client(monkeypatch):
    """Force `_client()` to return None (SendGrid not configured)."""
    sendgrid_email._client.cache_clear()
    monkeypatch.setattr(sendgrid_email, "_client", lambda: None)


@pytest.mark.asyncio
async def test_send_template_email_picks_correct_language(stub_client):
    await sendgrid_email.send_template_email(
        "amr@example.com",
        "BOOKING_CONFIRMED",
        {"bookingRef": "BK-1"},
        "ar",
    )
    stub_client.send.assert_called_once()
    msg = stub_client.send.call_args.args[0]
    # Pull the assembled JSON via .get(), which is the public sendgrid SDK shape.
    payload = msg.get()
    assert payload["template_id"] == "d-booking-confirmed-ar"


@pytest.mark.asyncio
async def test_send_template_email_injects_extra_data(stub_client):
    await sendgrid_email.send_template_email(
        "amr@example.com",
        "BOOKING_CONFIRMED",
        {"bookingRef": "BK-1", "customerName": "Amr"},
        "en",
    )
    msg = stub_client.send.call_args.args[0]
    payload = msg.get()
    data = payload["personalizations"][0]["dynamic_template_data"]
    assert data["bookingRef"] == "BK-1"
    assert data["customerName"] == "Amr"
    assert data["companyName"] == "[Company Name]"
    assert "supportEmail" in data
    assert "year" in data


@pytest.mark.asyncio
async def test_send_template_email_unknown_template_is_noop(stub_client):
    await sendgrid_email.send_template_email(
        "amr@example.com",
        "DOES_NOT_EXIST",
        {},
        "en",
    )
    stub_client.send.assert_not_called()


@pytest.mark.asyncio
async def test_send_template_email_unknown_language_is_noop(stub_client):
    """Asking for an unsupported language is a silent no-op (no template id)."""
    await sendgrid_email.send_template_email(
        "amr@example.com",
        "BOOKING_CONFIRMED",
        {},
        "fr",  # type: ignore[arg-type]
    )
    stub_client.send.assert_not_called()


@pytest.mark.asyncio
async def test_send_swallows_exceptions(stub_client):
    """SDK exceptions must never bubble up to the caller."""
    stub_client.send.side_effect = RuntimeError("SendGrid down")
    # Should not raise.
    await sendgrid_email.send_template_email(
        "amr@example.com",
        "BOOKING_CONFIRMED",
        {},
        "en",
    )


@pytest.mark.asyncio
async def test_send_noop_when_unconfigured(disabled_client):
    """Without SENDGRID_API_KEY, calls succeed silently."""
    await sendgrid_email.send_template_email(
        "amr@example.com",
        "BOOKING_CONFIRMED",
        {},
        "en",
    )
    # No assertion needed — the test just must not raise.


@pytest.mark.asyncio
async def test_convenience_wrappers_use_correct_template(stub_client):
    """Each wrapper picks the template its name advertises."""
    pairs = [
        (sendgrid_email.send_booking_confirmation, "d-booking-confirmed-en"),
        (sendgrid_email.send_booking_approved, "d-booking-approved-en"),
        (sendgrid_email.send_payment_receipt, "d-payment-receipt-en"),
        (sendgrid_email.send_lease_expiry_reminder, "d-lease-expiry-en"),
        (sendgrid_email.send_kyc_incomplete_alert, "d-kyc-incomplete-en"),
        (sendgrid_email.send_welcome, "d-welcome-en"),
    ]
    for fn, expected_id in pairs:
        stub_client.send.reset_mock()
        await fn("a@b.co", {"name": "test"}, "en")
        msg = stub_client.send.call_args.args[0]
        assert msg.get()["template_id"] == expected_id
