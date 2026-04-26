"""Tests for the Tabby integration wrapper."""

from __future__ import annotations

import httpx
import pytest

from origin_backend.integrations import tabby


@pytest.fixture
def configured_tabby(monkeypatch):
    monkeypatch.setattr(tabby.settings, "tabby_api_key", "fake-key")
    monkeypatch.setattr(tabby.settings, "tabby_merchant_code", "MERCH-1")


@pytest.fixture
def http_post(monkeypatch):
    sent: list[dict[str, object]] = []
    response_holder: dict[str, object] = {}

    async def fake_post(self, url, json=None, headers=None):
        sent.append({"url": url, "json": json, "headers": headers})
        body = response_holder.get("body", {})
        return httpx.Response(
            response_holder.get("status", 200),  # type: ignore[arg-type]
            json=body,
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    return {"sent": sent, "response": response_holder}


def _request(amount: float = 1500.0) -> tabby.TabbySessionRequest:
    return tabby.TabbySessionRequest(
        amountAed=amount,
        orderReference="BK-2026-AAAA1111",
        customerName="Amr",
        customerEmail="amr@example.com",
        customerPhone="+971501234567",
        successUrl="https://x/success",
        cancelUrl="https://x/cancel",
        failureUrl="https://x/failure",
        items=[
            tabby.TabbyItem(
                title="BYD Atto 3 — 6 Month Lease",
                quantity=1,
                unitPriceAed=1500.0,
            )
        ],
    )


# ── create_session ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_session_returns_payment_url(configured_tabby, http_post):
    http_post["response"]["body"] = {
        "id": "tab-1",
        "status": "created",
        "configuration": {
            "available_products": {"installments": [{"web_url": "https://tabby/checkout/abc"}]}
        },
    }

    session = await tabby.create_session(_request())
    assert session.sessionId == "tab-1"
    assert session.paymentUrl == "https://tabby/checkout/abc"
    assert session.status == "created"


@pytest.mark.asyncio
async def test_create_session_uses_bearer_token(configured_tabby, http_post):
    http_post["response"]["body"] = {
        "id": "x",
        "status": "created",
        "configuration": {"available_products": {"installments": [{"web_url": "u"}]}},
    }
    await tabby.create_session(_request())
    assert http_post["sent"][0]["headers"]["Authorization"] == "Bearer fake-key"


@pytest.mark.asyncio
async def test_create_session_400_when_no_configuration(configured_tabby, http_post):
    http_post["response"]["body"] = {"id": "x", "status": "created"}
    with pytest.raises(Exception) as exc_info:
        await tabby.create_session(_request())
    assert exc_info.value.status_code == 400  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_create_session_propagates_http_error(configured_tabby, http_post):
    http_post["response"]["status"] = 400
    http_post["response"]["body"] = {"error": "merchant config invalid"}
    with pytest.raises(Exception) as exc_info:
        await tabby.create_session(_request())
    assert exc_info.value.status_code == 400  # type: ignore[attr-defined]


# ── eligibility (returns False on errors) ─────────────────────────────


@pytest.mark.asyncio
async def test_check_eligibility_true_when_status_created(configured_tabby, http_post):
    http_post["response"]["body"] = {"status": "created"}
    ok = await tabby.check_eligibility("+971501234567", "amr@example.com", 1500.0)
    assert ok is True


@pytest.mark.asyncio
async def test_check_eligibility_false_on_other_status(configured_tabby, http_post):
    http_post["response"]["body"] = {"status": "rejected"}
    ok = await tabby.check_eligibility("+971501234567", "amr@example.com", 1500.0)
    assert ok is False


@pytest.mark.asyncio
async def test_check_eligibility_false_on_http_error(configured_tabby, monkeypatch):
    async def boom(self, url, json=None, headers=None):
        raise httpx.HTTPError("network down")

    monkeypatch.setattr(httpx.AsyncClient, "post", boom)
    ok = await tabby.check_eligibility("+971501234567", "amr@example.com", 1500.0)
    assert ok is False


# ── get_payment + capture_payment ─────────────────────────────────────


@pytest.mark.asyncio
async def test_get_payment_returns_body(configured_tabby, monkeypatch):
    async def fake_get(self, url, headers=None):
        return httpx.Response(
            200,
            json={"id": "p-1", "status": "AUTHORIZED"},
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    body = await tabby.get_payment("p-1")
    assert body == {"id": "p-1", "status": "AUTHORIZED"}


@pytest.mark.asyncio
async def test_capture_payment_posts_amount(configured_tabby, http_post):
    http_post["response"]["body"] = {}
    await tabby.capture_payment("p-1", 1500.50)
    payload = http_post["sent"][0]["json"]
    assert payload == {"amount": "1500.50"}
