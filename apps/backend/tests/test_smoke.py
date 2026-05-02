"""Smoke tests. No DB required — TestClient is used without context manager
so FastAPI lifespan never runs and Prisma never tries to connect."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client() -> TestClient:
    """TestClient without context manager — lifespan does NOT run, so no DB."""
    from origin_backend.main import app

    return TestClient(app)


def test_app_imports():
    from origin_backend.main import app

    assert app is not None
    assert app.title == "Origin Backend API"


def test_health_live(client: TestClient):
    r = client.get("/health/live")
    assert r.status_code == 200
    assert r.json()["status"] == "alive"


def test_health_ready_without_db(client: TestClient):
    """When lifespan hasn't run, prisma is not connected — readiness reports starting."""
    r = client.get("/health/ready")
    assert r.status_code == 200
    assert r.json()["status"] == "starting"


def test_public_api_mounted(client: TestClient):
    r = client.get("/api/v1/")
    assert r.status_code == 200
    assert r.json() == {"surface": "public", "version": "v1"}


def test_admin_api_mounted(client: TestClient):
    r = client.get("/api/admin/v1/")
    assert r.status_code == 200
    assert r.json() == {"surface": "admin", "version": "v1"}


def test_webhook_receiver_mounted(client: TestClient):
    r = client.get("/api/webhooks/")
    assert r.status_code == 200


def test_money_primitive():
    from origin_backend.core.kernel.money import Money

    a = Money(10000, "AED")
    b = Money(5000, "AED")
    assert (a + b).amount_minor == 15000
    assert (a - b).amount_minor == 5000

    with pytest.raises(ValueError):
        _ = a + Money(5000, "USD")

    with pytest.raises(ValueError):
        _ = Money(100, "aed")  # must be uppercase


def test_ulid_generation():
    from origin_backend.core.kernel.ids import new_id

    a = new_id()
    b = new_id()
    assert len(a) == 26
    assert a != b


def test_money_wire_roundtrip():
    from origin_backend.core.kernel.money import Money

    m = Money(12345, "AED")
    wire = m.to_wire()
    assert wire == {"amount_minor": 12345, "currency_code": "AED"}
    assert Money.from_wire(wire) == m
