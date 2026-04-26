"""
Tests for the /v1/maps endpoints.

We don't hit Google Maps; we patch the integration helpers and assert on
the HTTP shape and JWT gating.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from origin_backend.auth.jwt import issue_access_token
from origin_backend.integrations import google_maps

CUSTOMER_ID = "cust-1"


def _customer() -> SimpleNamespace:
    return SimpleNamespace(
        id=CUSTOMER_ID,
        phone="+971501234567",
        email=None,
        fullName="Amr",
        kycStatus=SimpleNamespace(value="PENDING"),
        preferredLanguage=SimpleNamespace(value="en"),
    )


def _auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {issue_access_token(sub=CUSTOMER_ID, role='customer')}"}


@pytest.fixture
def fake_autocomplete(monkeypatch):
    fake = AsyncMock(return_value=[])
    monkeypatch.setattr(google_maps, "autocomplete", fake)
    return fake


@pytest.fixture
def fake_place_details(monkeypatch):
    fake = AsyncMock(return_value=None)
    monkeypatch.setattr(google_maps, "get_place_details", fake)
    return fake


# ── Auth gating ───────────────────────────────────────────────────────


def test_autocomplete_requires_auth(client: TestClient):
    assert client.get("/v1/maps/autocomplete?input=Dubai").status_code == 401


def test_place_details_requires_auth(client: TestClient):
    assert client.get("/v1/maps/place-details?placeId=abc").status_code == 401


# ── /maps/autocomplete ────────────────────────────────────────────────


def test_autocomplete_passes_through(client: TestClient, mock_prisma: MagicMock, fake_autocomplete):
    mock_prisma.customer.find_unique.return_value = _customer()
    fake_autocomplete.return_value = [
        google_maps.PlaceSuggestion(placeId="pl-1", description="Dubai Marina, Dubai"),
        google_maps.PlaceSuggestion(placeId="pl-2", description="Business Bay, Dubai"),
    ]

    r = client.get("/v1/maps/autocomplete?input=Dubai", headers=_auth_headers())
    assert r.status_code == 200
    body = r.json()
    assert body == [
        {"placeId": "pl-1", "description": "Dubai Marina, Dubai"},
        {"placeId": "pl-2", "description": "Business Bay, Dubai"},
    ]
    fake_autocomplete.assert_awaited_once_with("Dubai", None)


def test_autocomplete_forwards_session_token(
    client: TestClient, mock_prisma: MagicMock, fake_autocomplete
):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.get(
        "/v1/maps/autocomplete?input=Marina&sessionToken=tok-1",
        headers=_auth_headers(),
    )
    assert r.status_code == 200
    fake_autocomplete.assert_awaited_once_with("Marina", "tok-1")


def test_autocomplete_rejects_empty_input(client: TestClient, mock_prisma: MagicMock):
    mock_prisma.customer.find_unique.return_value = _customer()
    r = client.get("/v1/maps/autocomplete?input=", headers=_auth_headers())
    assert r.status_code == 400


# ── /maps/place-details ───────────────────────────────────────────────


def test_place_details_returns_null_when_missing(
    client: TestClient, mock_prisma: MagicMock, fake_place_details
):
    mock_prisma.customer.find_unique.return_value = _customer()
    fake_place_details.return_value = None
    r = client.get("/v1/maps/place-details?placeId=missing", headers=_auth_headers())
    assert r.status_code == 200
    assert r.json() is None


def test_place_details_returns_record(
    client: TestClient, mock_prisma: MagicMock, fake_place_details
):
    mock_prisma.customer.find_unique.return_value = _customer()
    fake_place_details.return_value = google_maps.PlaceDetails(
        placeId="pl-1",
        name="Dubai Marina",
        address="Dubai Marina, Dubai, UAE",
        location=google_maps.LatLng(lat=25.0805, lng=55.1403),
    )
    r = client.get(
        "/v1/maps/place-details?placeId=pl-1&sessionToken=tok-1",
        headers=_auth_headers(),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["placeId"] == "pl-1"
    assert body["address"] == "Dubai Marina, Dubai, UAE"
    assert body["location"] == {"lat": 25.0805, "lng": 55.1403}
    fake_place_details.assert_awaited_once_with("pl-1", "tok-1")
