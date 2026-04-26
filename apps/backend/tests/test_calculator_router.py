"""
Tests for the /v1/calculator endpoint.

Mirrors apps/backend/src/calculator behaviour: deterministic quote maths
based on vehicle.monthlyRateAed, mileage surcharge, add-ons, and the
long-term discount tiers.
"""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock


def _vehicle(monthly: str = "1000.00", mileage_limit: int = 3000) -> SimpleNamespace:
    return SimpleNamespace(
        id="veh-1",
        monthlyRateAed=Decimal(monthly),
        mileageLimitMonthly=mileage_limit,
    )


# ── Validation ─────────────────────────────────────────────────────────


def test_quote_requires_vehicle_id(client):
    r = client.post(
        "/v1/calculator/quote",
        json={"start_date": "2026-04-01", "end_date": "2026-05-01", "mileage_package": 3000},
    )
    assert r.status_code == 400


def test_quote_rejects_low_mileage_package(client):
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 500,
        },
    )
    assert r.status_code == 400


def test_quote_returns_404_when_vehicle_missing(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_unique.return_value = None
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-x",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 3000,
        },
    )
    assert r.status_code == 404


def test_quote_rejects_end_before_start(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_unique.return_value = _vehicle()
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-05-01",
            "end_date": "2026-04-01",
            "mileage_package": 3000,
        },
    )
    assert r.status_code == 400
    assert "end_date" in r.json()["message"]


# ── Maths ──────────────────────────────────────────────────────────────


def test_quote_30_days_no_addons_no_discount(client, mock_prisma: MagicMock):
    """30 days exactly = 1 month, no discount tier hit."""
    mock_prisma.vehicle.find_unique.return_value = _vehicle("1000.00", 3000)
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 3000,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["duration_days"] == 30
    assert body["subtotal_aed"] == 1000.0
    assert body["vat_amount_aed"] == 50.0
    assert body["total_aed"] == 1050.0
    assert body["deposit_aed"] == 1000.0
    assert len(body["monthly_breakdown"]) == 1
    assert body["monthly_breakdown"][0]["amount_aed"] == 1000.0
    assert body["monthly_breakdown"][0]["total_aed"] == 1050.0


def test_quote_applies_mileage_surcharge(client, mock_prisma: MagicMock):
    """+ AED 0.05 per km above the vehicle's base limit."""
    mock_prisma.vehicle.find_unique.return_value = _vehicle("1000.00", 3000)
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 5000,
        },
    )
    body = r.json()
    # monthly = 1000 + (5000-3000)*0.05 = 1100
    assert body["subtotal_aed"] == 1100.0


def test_quote_applies_addons(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_unique.return_value = _vehicle("1000.00", 3000)
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 3000,
            "add_ons": {"cdw_waiver": True, "additional_driver": True, "gps_tracker": False},
        },
    )
    body = r.json()
    # monthly = 1000 + 200 (cdw) + 150 (driver) = 1350
    assert body["subtotal_aed"] == 1350.0


def test_quote_applies_long_term_discount(client, mock_prisma: MagicMock):
    """365+ days = 8% discount."""
    mock_prisma.vehicle.find_unique.return_value = _vehicle("1000.00", 3000)
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2027-04-01",
            "mileage_package": 3000,
        },
    )
    body = r.json()
    # 365 days exactly. monthly = 1000 * 0.92 = 920. months = 365/30 = 12.166...
    # subtotal = round2(920 * 12.1666...) = round2(11193.33...) = 11193.33
    assert body["subtotal_aed"] == 11193.33


def test_quote_discount_180_days(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_unique.return_value = _vehicle("1000.00", 3000)
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-09-28",  # 180 days
            "mileage_package": 3000,
        },
    )
    body = r.json()
    assert body["duration_days"] == 180
    # monthly *= 0.96
    # months = 180/30 = 6.0
    # subtotal = round2(960 * 6) = 5760
    assert body["subtotal_aed"] == 5760.0


def test_quote_unknown_addon_keys_are_ignored(client, mock_prisma: MagicMock):
    mock_prisma.vehicle.find_unique.return_value = _vehicle("1000.00", 3000)
    r = client.post(
        "/v1/calculator/quote",
        json={
            "vehicle_id": "veh-1",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "mileage_package": 3000,
            "add_ons": {"unknown_thing": True},
        },
    )
    body = r.json()
    assert body["subtotal_aed"] == 1000.0
