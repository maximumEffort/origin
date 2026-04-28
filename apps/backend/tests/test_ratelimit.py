"""Tests for the rate limiter on auth endpoints (issue #113)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from origin_backend.common.ratelimit import reset_buckets


@pytest.fixture(autouse=True)
def _reset() -> None:
    reset_buckets()


def test_admin_login_5_per_minute_per_ip(
    client: TestClient, mock_prisma: MagicMock
) -> None:
    """6th login attempt within a minute returns 429 with Retry-After."""
    mock_prisma.adminuser.find_unique.return_value = None
    payload = {"email": "x@example.com", "password": "wrong-pass"}

    for _ in range(5):
        res = client.post("/v1/auth/admin/login", json=payload)
        assert res.status_code in (401, 422), res.json()

    res = client.post("/v1/auth/admin/login", json=payload)
    assert res.status_code == 429
    assert res.json()["message"] == "Too many requests, please slow down."
    assert int(res.headers["Retry-After"]) >= 1


def test_otp_send_3_per_minute_per_phone(
    client: TestClient, mock_prisma: MagicMock
) -> None:
    """4th OTP send for the same phone within a minute returns 429."""
    payload = {"phone": "+971501234567"}

    for _ in range(3):
        res = client.post("/v1/auth/otp/send", json=payload)
        # service may 4xx (no Twilio creds in test) but rate limiter shouldn't trip
        assert res.status_code != 429

    res = client.post("/v1/auth/otp/send", json=payload)
    assert res.status_code == 429
    assert "Retry-After" in res.headers


def test_otp_send_separate_phones_have_separate_buckets(
    client: TestClient, mock_prisma: MagicMock
) -> None:
    for _ in range(3):
        client.post("/v1/auth/otp/send", json={"phone": "+971501111111"})

    res = client.post("/v1/auth/otp/send", json={"phone": "+971502222222"})
    assert res.status_code != 429


def test_otp_verify_5_per_minute_per_phone(
    client: TestClient, mock_prisma: MagicMock
) -> None:
    payload = {"phone": "+971501234567", "otp": "000000"}

    for _ in range(5):
        res = client.post("/v1/auth/otp/verify", json=payload)
        assert res.status_code != 429

    res = client.post("/v1/auth/otp/verify", json=payload)
    assert res.status_code == 429
