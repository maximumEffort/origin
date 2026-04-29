"""Tests for the /v1/leases endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from origin_backend.auth.jwt import issue_access_token

CUSTOMER_ID = "cust-1"
OTHER_CUSTOMER_ID = "cust-2"


def _customer() -> SimpleNamespace:
    return SimpleNamespace(
        id=CUSTOMER_ID,
        phone="+971501234567",
        email=None,
        fullName="Amr",
        kycStatus=SimpleNamespace(value="APPROVED"),
        preferredLanguage=SimpleNamespace(value="en"),
    )


def _vehicle_full() -> SimpleNamespace:
    return SimpleNamespace(brand="BYD", model="Atto 3", year=2026, plateNumber="ABC-1234")


def _payment(pid: str = "pay-1", status: str = "PENDING") -> SimpleNamespace:
    return SimpleNamespace(
        id=pid,
        leaseId="ls-1",
        type=SimpleNamespace(value="MONTHLY"),
        status=SimpleNamespace(value=status),
        amountAed=Decimal("1000.00"),
        dueDate=datetime(2026, 5, 1, tzinfo=UTC),
        paidAt=None,
    )


def _lease(
    *,
    lid: str = "ls-1",
    customer_id: str = CUSTOMER_ID,
    status: str = "ACTIVE",
    end: datetime | None = None,
    with_relations: bool = False,
) -> SimpleNamespace:
    data: dict[str, object] = {
        "id": lid,
        "reference": "LS-2026-AAAA1111",
        "bookingId": "bk-1",
        "customerId": customer_id,
        "vehicleId": "veh-1",
        "startDate": datetime(2026, 1, 1, tzinfo=UTC),
        "endDate": end if end is not None else datetime(2026, 12, 31, tzinfo=UTC),
        "serviceType": SimpleNamespace(value="RENT"),
        "monthlyRateAed": Decimal("1000.00"),
        "vatRate": Decimal("0.0500"),
        "mileageLimitMonthly": 3000,
        "downPaymentAed": None,
        "status": SimpleNamespace(value=status),
        "renewalOfId": None,
        "agreementPdfUrl": None,
        "notes": None,
        "createdAt": datetime(2025, 12, 15, tzinfo=UTC),
        "updatedAt": datetime(2025, 12, 15, tzinfo=UTC),
    }
    if with_relations:
        data["vehicle"] = _vehicle_full()
        data["payments"] = [_payment("pay-a"), _payment("pay-b")]
        data["booking"] = SimpleNamespace(reference="BK-2026-AAAA1111", pickupLocation="Dubai")
    return SimpleNamespace(**data)


def _customer_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=CUSTOMER_ID, role='customer')}"}


# ── Auth gating ────────────────────────────────────────────────────────


def test_list_leases_requires_auth(client: TestClient):
    assert client.get("/v1/leases").status_code == 401


def test_get_lease_requires_auth(client: TestClient):
    assert client.get("/v1/leases/ls-1").status_code == 401


# ── GET /leases ────────────────────────────────────────────────────────


def test_list_leases_returns_customer_only(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.lease.find_many.return_value = [_lease(lid="ls-a", with_relations=True)]

    r = client.get("/v1/leases", headers=_customer_headers())
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["id"] == "ls-a"
    assert body[0]["vehicle"]["plateNumber"] == "ABC-1234"
    assert len(body[0]["payments"]) == 2

    kwargs = mock_prisma.lease.find_many.call_args.kwargs
    assert kwargs["where"] == {"customerId": CUSTOMER_ID}
    assert kwargs["order"] == {"createdAt": "desc"}
    # #137 §3 — defensive cap so 1k+ lease customers don't ship 5-10 MB.
    assert kwargs["take"] == 50
    assert kwargs["include"]["vehicle"]["select"] == {
        "brand": True,
        "model": True,
        "year": True,
        "plateNumber": True,
    }
    assert kwargs["include"]["payments"]["order_by"] == {"dueDate": "asc"}


# ── GET /leases/:id ────────────────────────────────────────────────────


def test_get_lease_404_when_missing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.lease.find_unique.return_value = None
    r = client.get("/v1/leases/missing", headers=_customer_headers())
    assert r.status_code == 404


def test_get_lease_403_when_other_customers(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.lease.find_unique.return_value = _lease(
        customer_id=OTHER_CUSTOMER_ID, with_relations=True
    )
    r = client.get("/v1/leases/ls-1", headers=_customer_headers())
    assert r.status_code == 403


def test_get_lease_returns_full_record(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.lease.find_unique.return_value = _lease(with_relations=True)

    r = client.get("/v1/leases/ls-1", headers=_customer_headers())
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "ls-1"
    assert body["booking"]["reference"] == "BK-2026-AAAA1111"
    assert body["booking"]["pickupLocation"] == "Dubai"

    kwargs = mock_prisma.lease.find_unique.call_args.kwargs
    assert kwargs["where"] == {"id": "ls-1"}
    assert kwargs["include"]["booking"]["select"] == {
        "reference": True,
        "pickupLocation": True,
    }


# ── POST /leases/:id/renew ─────────────────────────────────────────────


def test_renew_lease_404_when_missing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.lease.find_unique.return_value = None
    r = client.post(
        "/v1/leases/missing/renew",
        headers=_customer_headers(),
        json={"new_end_date": "2027-12-31"},
    )
    assert r.status_code == 404


def test_renew_lease_403_when_other_customers(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.lease.find_unique.return_value = _lease(customer_id=OTHER_CUSTOMER_ID)
    r = client.post(
        "/v1/leases/ls-1/renew",
        headers=_customer_headers(),
        json={"new_end_date": "2027-12-31"},
    )
    assert r.status_code == 403
    mock_prisma.lease.update.assert_not_awaited()
    mock_prisma.lease.create.assert_not_awaited()


def test_renew_lease_400_when_not_active(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.lease.find_unique.return_value = _lease(status="COMPLETED")
    r = client.post(
        "/v1/leases/ls-1/renew",
        headers=_customer_headers(),
        json={"new_end_date": "2027-12-31"},
    )
    assert r.status_code == 400
    assert "active" in r.json()["message"].lower()


def test_renew_lease_400_when_new_end_not_after_current(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.lease.find_unique.return_value = _lease(end=datetime(2026, 12, 31, tzinfo=UTC))
    r = client.post(
        "/v1/leases/ls-1/renew",
        headers=_customer_headers(),
        json={"new_end_date": "2026-06-01"},
    )
    assert r.status_code == 400
    mock_prisma.lease.update.assert_not_awaited()
    mock_prisma.lease.create.assert_not_awaited()


def test_renew_lease_happy_path(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    original = _lease(end=datetime(2026, 12, 31, tzinfo=UTC))
    mock_prisma.lease.find_unique.return_value = original
    mock_prisma.lease.update.return_value = _lease(status="RENEWED")
    new_lease = _lease(lid="ls-renewed")
    mock_prisma.lease.create.return_value = new_lease

    r = client.post(
        "/v1/leases/ls-1/renew",
        headers=_customer_headers(),
        json={"new_end_date": "2027-12-31", "mileage_package": 5000},
    )
    assert r.status_code == 200
    assert r.json()["id"] == "ls-renewed"

    # Original was marked RENEWED
    update_args = mock_prisma.lease.update.call_args.kwargs
    assert update_args["where"] == {"id": "ls-1"}
    assert update_args["data"] == {"status": "RENEWED"}

    # New lease starts at the original's end date and uses the new mileage
    create_args = mock_prisma.lease.create.call_args.kwargs["data"]
    assert create_args["bookingId"] == "bk-1"
    assert create_args["vehicleId"] == "veh-1"
    assert create_args["startDate"] == original.endDate
    assert create_args["mileageLimitMonthly"] == 5000
    assert create_args["renewalOfId"] == "ls-1"
    assert create_args["status"] == "ACTIVE"
    assert create_args["reference"].startswith("LS-")


def test_renew_lease_defaults_mileage_to_existing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    original = _lease(end=datetime(2026, 12, 31, tzinfo=UTC))
    mock_prisma.lease.find_unique.return_value = original
    mock_prisma.lease.update.return_value = _lease(status="RENEWED")
    mock_prisma.lease.create.return_value = _lease(lid="ls-renewed")

    r = client.post(
        "/v1/leases/ls-1/renew",
        headers=_customer_headers(),
        json={"new_end_date": "2027-12-31"},
    )
    assert r.status_code == 200
    create_args = mock_prisma.lease.create.call_args.kwargs["data"]
    assert create_args["mileageLimitMonthly"] == original.mileageLimitMonthly


def test_renew_rejects_low_mileage(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/leases/ls-1/renew",
        headers=_customer_headers(),
        json={"new_end_date": "2027-12-31", "mileage_package": 500},
    )
    assert r.status_code == 400
