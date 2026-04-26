"""
Tests for the Firebase push integration.

The Firebase Admin SDK is heavy; we patch its `messaging` module so no
real init or network happens.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from origin_backend.integrations import firebase_push


@pytest.fixture(autouse=True)
def _reset_init():
    firebase_push._reset_for_tests()
    yield
    firebase_push._reset_for_tests()


@pytest.fixture
def configured_firebase(monkeypatch):
    """Pretend the SDK initialised successfully."""

    def fake_init() -> bool:
        firebase_push._initialised = True
        return True

    monkeypatch.setattr(firebase_push, "_init", fake_init)


@pytest.fixture
def messaging_stub(monkeypatch, configured_firebase):
    """Replace firebase_admin.messaging.send / send_each_for_multicast."""
    sent: list[object] = []

    def fake_send(message):
        sent.append(message)
        return "msg-id-fake"

    multi_results: list[object] = []

    def fake_multi(message):
        multi_results.append(message)
        return SimpleNamespace(success_count=len(message.tokens), failure_count=0)

    monkeypatch.setattr(firebase_push.messaging, "send", fake_send)
    monkeypatch.setattr(firebase_push.messaging, "send_each_for_multicast", fake_multi)
    return SimpleNamespace(send=sent, multi=multi_results)


# ── Init ───────────────────────────────────────────────────────────────


def test_unconfigured_returns_false(monkeypatch):
    monkeypatch.setattr(firebase_push.settings, "firebase_service_account_json", None)
    assert firebase_push._init() is False


def test_invalid_json_returns_false(monkeypatch):
    monkeypatch.setattr(
        firebase_push.settings, "firebase_service_account_json", "not-json"
    )
    assert firebase_push._init() is False


# ── send_to_device ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_send_to_device_unconfigured_is_silent(monkeypatch):
    monkeypatch.setattr(firebase_push.settings, "firebase_service_account_json", None)
    await firebase_push.send_to_device(
        firebase_push.PushNotification(token="t1", title="Hi", body="Hello")
    )


@pytest.mark.asyncio
async def test_send_to_device_passes_correct_payload(messaging_stub):
    await firebase_push.send_to_device(
        firebase_push.PushNotification(
            token="t1", title="Hi", body="Hello", data={"screen": "portal"}
        )
    )
    assert len(messaging_stub.send) == 1
    msg = messaging_stub.send[0]
    assert msg.token == "t1"
    assert msg.notification.title == "Hi"
    assert msg.notification.body == "Hello"
    assert msg.data == {"screen": "portal"}


@pytest.mark.asyncio
async def test_send_to_device_swallows_errors(monkeypatch, configured_firebase):
    """SDK errors must not bubble — stale tokens are common in production."""

    def boom(message):
        raise RuntimeError("token expired")

    monkeypatch.setattr(firebase_push.messaging, "send", boom)
    # Must not raise.
    await firebase_push.send_to_device(
        firebase_push.PushNotification(token="t1", title="Hi", body="Hello")
    )


# ── send_to_devices ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_send_to_devices_empty_list_is_noop(messaging_stub):
    await firebase_push.send_to_devices([], "T", "B")
    assert messaging_stub.multi == []


@pytest.mark.asyncio
async def test_send_to_devices_batches_above_500(messaging_stub):
    """1200 tokens → three batches (500, 500, 200)."""
    tokens = [f"tok-{i}" for i in range(1200)]
    await firebase_push.send_to_devices(tokens, "Title", "Body", data={"k": "v"})

    assert len(messaging_stub.multi) == 3
    sizes = [len(m.tokens) for m in messaging_stub.multi]
    assert sizes == [500, 500, 200]


# ── send_to_topic ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_send_to_topic(messaging_stub):
    await firebase_push.send_to_topic(
        firebase_push.TopicNotification(topic="fleet-alerts", title="T", body="B")
    )
    msg = messaging_stub.send[0]
    assert msg.topic == "fleet-alerts"


# ── (un)subscribe_to_topic ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_subscribe_unsubscribe_topic(monkeypatch, configured_firebase):
    sub = MagicMock(return_value=SimpleNamespace(success_count=2))
    unsub = MagicMock(return_value=SimpleNamespace(success_count=1))
    monkeypatch.setattr(firebase_push.messaging, "subscribe_to_topic", sub)
    monkeypatch.setattr(firebase_push.messaging, "unsubscribe_from_topic", unsub)

    await firebase_push.subscribe_to_topic(["t1", "t2"], "fleet-alerts")
    sub.assert_called_once_with(["t1", "t2"], "fleet-alerts")

    await firebase_push.unsubscribe_from_topic(["t1"], "fleet-alerts")
    unsub.assert_called_once_with(["t1"], "fleet-alerts")
