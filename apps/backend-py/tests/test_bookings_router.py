"""
Tests for the /v1/bookings endpoints.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from origin_backend.auth.jwt import issue_access_token

CUSTOMER_ID = "cust-1"
OTHER_CUSTOMER_ID = "cust-2"


def _customer(customer_id: str = CUSTOMER_ID) -> SimpleNamespace:
    return SimpleNamespace(
        id=customer_id,
        phone="+971501234567",
        email=None,
        fullName="Amr",
        kycStatus=SimpleNamespace(value="PENDING"),
        preferredLanguage=SimpleNamespace(value="en"),
    )


def _vehicle() -> SimpleNamespace:
    return SimpleNamespace(
        id="veh-1",
        monthlyRateAed=Decimal("1000.00"),
        mileageLimitMonthly=3000,
        brand="BYD",
        model="Atto 3",
        year=2026,
    )


def _booking(
    *,
    bid: str = "bk-1",
    customer_id: str = CUSTOMER_ID,
    status: str = "DRAFT",
    with_vehicle: bool = False,
) -> SimpleNamespace:
    data: dict[str, object] = {
        "id": bid,
        "reference": "BK-2026-ABCD1234",
        "customerId": customer_id,
        "vehicleId": "veh-1",
        "leaseType": SimpleNamespace(value="LONG_TERM"),
        "serviceType": SimpleNamespace(value="RENT"),
        "startDate": datetime(2026, 4, 1, tzinfo=UTC),
        "endDate": datetime(2026, 5, 1, tzinfo=UTC),
        "durationDays": 30,
        "mileagePackage": 3000,
        "addOns": {},
        "quotedTotalAed": Decimal("1000.00"),
        "vatAmountAed": Decimal("50.00"),
        "grandTotalAed": Decimal("1050.00"),
        "depositAmountAed": Decimal("1000.00"),
        "depositPaid": False,
        "status": SimpleNamespace(value=status),
        "rejectionReason": None,
        "pickupLocation": None,
        "dropoffLocation": None,
        "notes": None,
        "createdAt": datetime(2026, 4, 25, tzinfo=UTC),
        "updatedAt": datetime(2026, 4, 25, tzinfo=UTC),
    }
    if with_vehicle:
        data["vehicle"] = _vehicle()
    return SimpleNamespace(**data)


def _customer_headers(customer_id: str = CUSTOMER_ID) -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=customer_id, role='customer')}"}


# ── Auth gating ────────────────────────────────────────────────────────


def test_create_booking_requires_auth(client: TestClient):
    r = client.post("/v1/bookings", json={})
    assert r.status_code == 401


def test_list_bookings_requires_auth(client: TestClient):
    r = client.get("/v1/bookings")
    assert r.status_code == 401


# ── POST /bookings ─────────────────────────────────────────────────────


def test_create_booking_returns_draft_with_calculator_totals(
    client: TestClient, mock_prisma: MagicMock
):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.vehicle.find_unique.return_value = _vehicle()
    mock_prisma.booking.create.return_value = _booking()

    r = client.post(
        "/v1/bookings",
        headers=_customer_headers(),
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 3000,
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "DRAFT"
    assert body["leaseType"] == "LONG_TERM"

    create_args = mock_prisma.booking.create.call_args.kwargs["data"]
    assert create_args["customerId"] == CUSTOMER_ID
    assert create_args["status"] == "DRAFT"
    assert create_args["durationDays"] == 30
    # 30 days exactly => LONG_TERM (>= 30)
    assert create_args["leaseType"] == "LONG_TERM"
    assert create_args["quotedTotalAed"] == 1000.0
    assert create_args["vatAmountAed"] == 50.0
    assert create_args["grandTotalAed"] == 1050.0
    assert create_args["reference"].startswith("BK-")


def test_create_booking_short_term_under_30_days(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.vehicle.find_unique.return_value = _vehicle()
    mock_prisma.booking.create.return_value = _booking()

    r = client.post(
        "/v1/bookings",
        headers=_customer_headers(),
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-04-15",
            "mileage_package": 3000,
        },
    )
    assert r.status_code == 201
    create_args = mock_prisma.booking.create.call_args.kwargs["data"]
    assert create_args["leaseType"] == "SHORT_TERM"
    assert create_args["durationDays"] == 14


def test_create_booking_propagates_calculator_validation(
    client: TestClient, mock_prisma: MagicMock
):
    """Vehicle missing => 404 from calculator bubbles up."""
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.vehicle.find_unique.return_value = None

    r = client.post(
        "/v1/bookings",
        headers=_customer_headers(),
        json={
            "vehicle_id": "veh-x",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 3000,
        },
    )
    assert r.status_code == 404
    mock_prisma.booking.create.assert_not_awaited()


def test_create_booking_rejects_unknown_field(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.post(
        "/v1/bookings",
        headers=_customer_headers(),
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 3000,
            "internal_admin_flag": True,
        },
    )
    assert r.status_code == 400


# ── POST /bookings/:id/submit ──────────────────────────────────────────


def test_submit_booking_happy_path(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking()
    mock_prisma.booking.update.return_value = _booking(status="SUBMITTED")

    r = client.post("/v1/bookings/bk-1/submit", headers=_customer_headers())
    assert r.status_code == 200
    assert r.json()["status"] == "SUBMITTED"

    update_args = mock_prisma.booking.update.call_args.kwargs
    assert update_args["where"] == {"id": "bk-1"}
    assert update_args["data"] == {"status": "SUBMITTED"}


def test_submit_booking_404_when_missing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = None
    r = client.post("/v1/bookings/missing/submit", headers=_customer_headers())
    assert r.status_code == 404


def test_submit_booking_403_when_other_customers(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking(customer_id=OTHER_CUSTOMER_ID)
    r = client.post("/v1/bookings/bk-1/submit", headers=_customer_headers())
    assert r.status_code == 403
    mock_prisma.booking.update.assert_not_awaited()


def test_submit_booking_400_when_not_draft(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking(status="SUBMITTED")
    r = client.post("/v1/bookings/bk-1/submit", headers=_customer_headers())
    assert r.status_code == 400
    assert "draft" in r.json()["message"].lower()


# ── GET /bookings ──────────────────────────────────────────────────────


def test_list_bookings_returns_customer_only(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_many.return_value = [
        _booking(bid="bk-a", with_vehicle=True),
        _booking(bid="bk-b"),
    ]

    r = client.get("/v1/bookings", headers=_customer_headers())
    assert r.status_code == 200
    body = r.json()
    assert [b["id"] for b in body] == ["bk-a", "bk-b"]
    assert body[0]["vehicle"]["brand"] == "BYD"

    kwargs = mock_prisma.booking.find_many.call_args.kwargs
    assert kwargs["where"] == {"customerId": CUSTOMER_ID}
    assert kwargs["order"] == {"createdAt": "desc"}
    assert kwargs["include"]["vehicle"]["select"] == {
        "brand": True,
        "model": True,
        "year": True,
    }


# ── GET /bookings/:id ──────────────────────────────────────────────────


def test_get_booking_404_when_missing(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = None
    r = client.get("/v1/bookings/missing", headers=_customer_headers())
    assert r.status_code == 404


def test_get_booking_403_when_other_customers(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking(
        customer_id=OTHER_CUSTOMER_ID, with_vehicle=True
    )
    r = client.get("/v1/bookings/bk-1", headers=_customer_headers())
    assert r.status_code == 403


def test_get_booking_returns_full_record_with_vehicle(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    mock_prisma.booking.find_unique.return_value = _booking(with_vehicle=True)
    r = client.get("/v1/bookings/bk-1", headers=_customer_headers())
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "bk-1"
    assert body["reference"].startswith("BK-")
    assert body["vehicle"]["model"] == "Atto 3"
