"""Smoke tests. Don't touch the database — just verify the app imports and
the gateway routers are mounted."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_app_imports():
    from origin_backend.main import app

    assert app is not None
    assert app.title == "Origin Backend API"


def test_health_live():
    from origin_backend.main import app

    with TestClient(app) as client:
        r = client.get("/health/live")
        assert r.status_code == 200
        assert r.json()["status"] == "alive"


def test_public_api_mounted():
    from origin_backend.main import app

    with TestClient(app) as client:
        r = client.get("/api/v1/")
        assert r.status_code == 200
        assert r.json() == {"surface": "public", "version": "v1"}


def test_admin_api_mounted():
    from origin_backend.main import app

    with TestClient(app) as client:
        r = client.get("/api/admin/v1/")
        assert r.status_code == 200


def test_money_primitive():
    from origin_backend.core.kernel.money import Money

    a = Money(10000, "AED")
    b = Money(5000, "AED")
    assert (a + b).amount_minor == 15000

    import pytest

    with pytest.raises(ValueError):
        a + Money(5000, "USD")


def test_ulid_generation():
    from origin_backend.core.kernel.ids import new_id

    a = new_id()
    b = new_id()
    assert len(a) == 26
    assert a != b
