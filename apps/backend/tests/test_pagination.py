"""Tests for admin list endpoint pagination (issue #115)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient


def _admin(role: str = "SUPER_ADMIN") -> SimpleNamespace:
    return SimpleNamespace(id="adm-1", email="a@x", fullName="A", role=role, isActive=True)


def _admin_headers(role: str) -> dict[str, str]:
    """Build a Bearer header that admin auth will accept (matches test_admin_router pattern)."""
    from origin_backend.auth.jwt import issue_access_token

    return {"Authorization": f"Bearer {issue_access_token(sub='adm-1', role=role)}"}


def test_vehicles_default_pagination(client: TestClient, mock_prisma: MagicMock) -> None:
    mock_prisma.adminuser.find_unique.return_value = _admin("FINANCE")
    mock_prisma.vehicle.find_many.return_value = []
    mock_prisma.vehicle.count.return_value = 0

    res = client.get("/v1/admin/vehicles", headers=_admin_headers("FINANCE"))
    assert res.status_code == 200

    body = res.json()
    assert body["data"] == []
    assert body["pagination"] == {"page": 1, "limit": 50, "total": 0}

    kwargs = mock_prisma.vehicle.find_many.call_args.kwargs
    assert kwargs["skip"] == 0
    assert kwargs["take"] == 50


def test_vehicles_custom_pagination(client: TestClient, mock_prisma: MagicMock) -> None:
    mock_prisma.adminuser.find_unique.return_value = _admin("FINANCE")
    mock_prisma.vehicle.find_many.return_value = []
    mock_prisma.vehicle.count.return_value = 257

    res = client.get("/v1/admin/vehicles?page=3&limit=20", headers=_admin_headers("FINANCE"))
    assert res.status_code == 200

    body = res.json()
    assert body["pagination"] == {"page": 3, "limit": 20, "total": 257}

    kwargs = mock_prisma.vehicle.find_many.call_args.kwargs
    assert kwargs["skip"] == 40
    assert kwargs["take"] == 20


def test_pagination_bounds(client: TestClient, mock_prisma: MagicMock) -> None:
    """page<1 and limit>MAX_LIMIT are rejected with 400 (validator rewrites 422→400)."""
    mock_prisma.adminuser.find_unique.return_value = _admin("FINANCE")

    r = client.get("/v1/admin/vehicles?page=0", headers=_admin_headers("FINANCE"))
    assert r.status_code == 400

    r = client.get("/v1/admin/vehicles?limit=500", headers=_admin_headers("FINANCE"))
    assert r.status_code == 400


def test_bookings_paginated_with_status_filter(client: TestClient, mock_prisma: MagicMock) -> None:
    mock_prisma.adminuser.find_unique.return_value = _admin("SALES")
    mock_prisma.booking.find_many.return_value = []
    mock_prisma.booking.count.return_value = 4

    res = client.get(
        "/v1/admin/bookings?status=SUBMITTED&page=1&limit=10",
        headers=_admin_headers("SALES"),
    )
    assert res.status_code == 200
    assert res.json()["pagination"] == {"page": 1, "limit": 10, "total": 4}

    where = mock_prisma.booking.find_many.call_args.kwargs["where"]
    assert where == {"status": "SUBMITTED"}


def test_customers_and_leases_paginated(client: TestClient, mock_prisma: MagicMock) -> None:
    mock_prisma.adminuser.find_unique.return_value = _admin("SUPER_ADMIN")
    mock_prisma.customer.find_many.return_value = []
    mock_prisma.customer.count.return_value = 0
    mock_prisma.lease.find_many.return_value = []
    mock_prisma.lease.count.return_value = 0

    rc = client.get("/v1/admin/customers", headers=_admin_headers("SUPER_ADMIN"))
    rl = client.get("/v1/admin/leases", headers=_admin_headers("SUPER_ADMIN"))

    assert rc.status_code == 200
    assert rl.status_code == 200
    assert rc.json()["pagination"]["limit"] == 50
    assert rl.json()["pagination"]["limit"] == 50
