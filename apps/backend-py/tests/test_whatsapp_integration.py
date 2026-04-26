"""
Tests for the WhatsApp integration wrapper.

Patches the HTTP layer (no network) and asserts on the Graph API
payload shape.
"""

from __future__ import annotations

import httpx
import pytest

from origin_backend.integrations import whatsapp


@pytest.fixture
def configured_whatsapp(monkeypatch):
    """Pretend WhatsApp is configured so _post() actually fires."""
    monkeypatch.setattr(whatsapp.settings, "whatsapp_access_token", "fake-token")
    monkeypatch.setattr(whatsapp.settings, "whatsapp_phone_number_id", "phone-id-123")


@pytest.fixture
def http_post(monkeypatch):
    """Patch the AsyncClient.post used inside whatsapp._post."""
    sent: list[dict[str, object]] = []

    async def fake_post(self, url, json=None, headers=None):
        sent.append({"url": url, "json": json, "headers": headers})
        return httpx.Response(200, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    return sent


# ── Phone normalisation ─────────────────────────────────────────────────


def test_normalise_phone_with_country_code():
    assert whatsapp._normalise_phone("+971501234567") == "+971501234567"


def test_normalise_phone_strips_separators():
    assert whatsapp._normalise_phone("+971 50 123 4567") == "+971501234567"


def test_normalise_phone_adds_country_code():
    """A bare local number gets the UAE prefix."""
    assert whatsapp._normalise_phone("501234567") == "+971501234567"


# ── Template selection ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_send_template_unknown_key_is_noop(configured_whatsapp, http_post):
    await whatsapp.send_template("+971501234567", "DOES_NOT_EXIST", {}, "en")
    assert http_post == []


@pytest.mark.asyncio
async def test_send_template_unknown_language_is_noop(configured_whatsapp, http_post):
    await whatsapp.send_template("+971501234567", "WELCOME", {"customerName": "Amr"}, "fr")  # type: ignore[arg-type]
    assert http_post == []


@pytest.mark.asyncio
async def test_send_template_emits_correct_template_name(configured_whatsapp, http_post):
    await whatsapp.send_welcome(
        "+971501234567",
        {"customerName": "Amr", "catalogueUrl": "https://x"},
        "ar",
    )
    assert len(http_post) == 1
    body = http_post[0]["json"]
    assert body["template"]["name"] == "welcome_ar"
    assert body["template"]["language"] == {"code": "ar"}


@pytest.mark.asyncio
async def test_send_template_zh_uses_zh_cn_lang_code(configured_whatsapp, http_post):
    """Meta expects zh_CN, not zh — same as the Node service."""
    await whatsapp.send_welcome(
        "+971501234567",
        {"customerName": "Amr", "catalogueUrl": "https://x"},
        "zh",
    )
    body = http_post[0]["json"]
    assert body["template"]["language"] == {"code": "zh_CN"}


@pytest.mark.asyncio
async def test_send_template_passes_params_in_order(configured_whatsapp, http_post):
    await whatsapp.send_booking_confirmation(
        "+971501234567",
        {
            "customerName": "Amr",
            "vehicleName": "BYD Atto 3",
            "startDate": "2026-04-01",
            "bookingRef": "BK-2026-AAAA1111",
        },
        "en",
    )
    body = http_post[0]["json"]
    params = body["template"]["components"][0]["parameters"]
    assert [p["text"] for p in params] == [
        "Amr",
        "BYD Atto 3",
        "2026-04-01",
        "BK-2026-AAAA1111",
    ]


# ── Auth header + URL ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_send_uses_bearer_token_and_phone_id(configured_whatsapp, http_post):
    await whatsapp.send_text("+971501234567", "Hello")
    assert http_post[0]["headers"]["Authorization"] == "Bearer fake-token"
    assert "phone-id-123" in http_post[0]["url"]


# ── Unconfigured no-op ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_unconfigured_is_silent(monkeypatch, http_post):
    """Without env config, no HTTP call is made and no error is raised."""
    monkeypatch.setattr(whatsapp.settings, "whatsapp_access_token", None)
    monkeypatch.setattr(whatsapp.settings, "whatsapp_phone_number_id", None)
    await whatsapp.send_welcome(
        "+971501234567",
        {"customerName": "Amr", "catalogueUrl": "https://x"},
        "en",
    )
    assert http_post == []


# ── Failure swallowing ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_send_swallows_http_errors(configured_whatsapp, monkeypatch):
    async def boom(self, url, json=None, headers=None):
        raise httpx.HTTPError("boom")

    monkeypatch.setattr(httpx.AsyncClient, "post", boom)
    # Must not raise.
    await whatsapp.send_text("+971501234567", "Hello")
