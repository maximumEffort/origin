"""Tests for the /v1/vehicles endpoints."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock


def _category() -> SimpleNamespace:
    return SimpleNamespace(
        id="cat-1",
        nameEn="Electric SUV",
        nameAr="سيارة كهربائية SUV",
        nameZh="电动SUV",
        icon="suv-icon",
    )


def _image(image_id: str = "img-1", url: str = "https://cdn.test/p.jpg") -> SimpleNamespace:
    return SimpleNamespace(id=image_id, url=url, isPrimary=True, sortOrder=0)


def _vehicle(
    vid: str = "veh-1",
    *,
    monthly: str = "1500.00",
    with_image: bool = True,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=vid,
        vin=f"VIN-{vid}",
        plateNumber=f"PLT-{vid}",
        brand="BYD",
        model="Atto 3",
        year=2026,
        category=_category(),
        fuelType="ELECTRIC",
        transmission="AUTOMATIC",
        colour="white",
        seats=5,
        status="AVAILABLE",
        priceAed=None,
        dailyRateAed=Decimal("180.00"),
        monthlyRateAed=Decimal(monthly),
        leaseMonthlyAed=None,
        downPaymentPct=Decimal("0.20"),
        mileageLimitMonthly=3000,
        rtaRegistrationExpiry=None,
        insuranceExpiry=None,
        lastServiceDate=None,
        nextServiceDue=None,
        notes=None,
        images=[_image()] if with_image else [],
        createdAt="2026-04-25T12:00:00Z",
        updatedAt="2026-04-25T12:00:00Z",
    )


# List endpoint ---------------------------------------------------------


def test_list_vehicles_empty(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_many.return_value = []
    mock_prisma.vehicle.count.return_value = 0

    r = client.get("/v1/vehicles")
    assert r.status_code == 200
    body = r.json()
    assert body["data"] == []
    assert body["pagination"] == {"page": 1, "limit": 20, "total": 0}


def test_list_vehicles_returns_summaries(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_many.return_value = [_vehicle("a"), _vehicle("b", with_image=False)]
    mock_prisma.vehicle.count.return_value = 2

    r = client.get("/v1/vehicles?page=1&limit=10")
    assert r.status_code == 200
    body = r.json()
    assert body["pagination"] == {"page": 1, "limit": 10, "total": 2}
    assert len(body["data"]) == 2
    a, b = body["data"]
    assert a["id"] == "a"
    assert a["primaryImageUrl"] == "https://cdn.test/p.jpg"
    assert b["id"] == "b"
    assert b["primaryImageUrl"] is None


def test_list_vehicles_brand_filter_uppercased(client, mock_prisma: MagicMock):
    """Lowercase brand input is upper-cased before being sent to Prisma."""
    mock_prisma.vehicle.find_many.return_value = []
    mock_prisma.vehicle.count.return_value = 0

    r = client.get("/v1/vehicles?brand=byd")
    assert r.status_code == 200

    where = mock_prisma.vehicle.find_many.call_args.kwargs["where"]
    assert where["brand"] == "BYD"
    assert where["status"] == "AVAILABLE"


def test_list_vehicles_price_range_filter(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_many.return_value = []
    mock_prisma.vehicle.count.return_value = 0

    r = client.get("/v1/vehicles?min_price=1000&max_price=3000")
    assert r.status_code == 200
    where = mock_prisma.vehicle.find_many.call_args.kwargs["where"]
    assert where["monthlyRateAed"] == {"gte": 1000.0, "lte": 3000.0}


def test_list_vehicles_category_uses_case_insensitive_contains(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_many.return_value = []
    mock_prisma.vehicle.count.return_value = 0

    r = client.get("/v1/vehicles?category=electric")
    assert r.status_code == 200
    where = mock_prisma.vehicle.find_many.call_args.kwargs["where"]
    assert where["category"] == {"nameEn": {"contains": "electric", "mode": "insensitive"}}


def test_list_vehicles_pagination_skip_take(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_many.return_value = []
    mock_prisma.vehicle.count.return_value = 0

    r = client.get("/v1/vehicles?page=3&limit=15")
    assert r.status_code == 200
    kwargs = mock_prisma.vehicle.find_many.call_args.kwargs
    # page=3 limit=15 => skip=30 take=15
    assert kwargs["skip"] == 30
    assert kwargs["take"] == 15


def test_list_vehicles_rejects_negative_min_price(client):
    r = client.get("/v1/vehicles?min_price=-1")
    assert r.status_code == 400


def test_list_vehicles_rejects_limit_above_100(client):
    r = client.get("/v1/vehicles?limit=500")
    assert r.status_code == 400


# Detail endpoint -------------------------------------------------------


def test_get_vehicle_returns_404_when_missing(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_unique.return_value = None
    r = client.get("/v1/vehicles/nope")
    assert r.status_code == 404
    body = r.json()
    # exception envelope format from common/exceptions.py
    assert "not found" in str(body).lower()


def test_get_vehicle_returns_full_record(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_unique.return_value = _vehicle("veh-42")

    r = client.get("/v1/vehicles/veh-42")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "veh-42"
    assert body["vin"] == "VIN-veh-42"
    assert body["plateNumber"] == "PLT-veh-42"
    assert body["category"]["nameEn"] == "Electric SUV"
    assert body["images"][0]["url"] == "https://cdn.test/p.jpg"
    assert body["fuelType"] == "ELECTRIC"

    # Confirm we passed include={category, images ordered by sortOrder asc}
    kwargs = mock_prisma.vehicle.find_unique.call_args.kwargs
    assert kwargs["where"] == {"id": "veh-42"}
    assert kwargs["include"]["category"] is True
    assert kwargs["include"]["images"]["order_by"] == {"sortOrder": "asc"}
