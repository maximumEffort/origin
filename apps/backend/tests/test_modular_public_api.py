"""Tests for the new country-aware modular public API."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock


def _country() -> SimpleNamespace:
    return SimpleNamespace(
        id="country-ae",
        code="AE",
        name="United Arab Emirates",
        defaultCurrencyCode="AED",
        vatRate=Decimal("0.0500"),
        productFlags={
            "rental": True,
            "purchase": False,
            "leaseToOwn": False,
            "fleetB2B": False,
        },
        enabledPaymentGateways=["STRIPE", "CHECKOUT_COM", "TABBY"],
        isActive=True,
    )


def _vehicle() -> SimpleNamespace:
    return SimpleNamespace(
        id="veh-1",
        countryId="country-ae",
        monthlyRate=Decimal("1000.00"),
        mileageLimitMonthly=3000,
        status=SimpleNamespace(value="AVAILABLE"),
    )


def test_country_bootstrap_returns_uae_config(client, mock_prisma: MagicMock) -> None:
    mock_prisma.country.find_unique.return_value = _country()
    mock_prisma.kycdocumenttype.find_many.return_value = [
        SimpleNamespace(
            code="EMIRATES_ID",
            labelEn="Emirates ID",
            labelAr=None,
            labelZh=None,
            isRequired=True,
            requiresExpiry=True,
        )
    ]

    response = client.get("/v2/public/countries/current")

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == "AE"
    assert body["defaultCurrencyCode"] == "AED"
    assert body["productFlags"]["rental"] is True
    assert body["kycDocumentTypes"][0]["code"] == "EMIRATES_ID"


def test_rental_quote_is_country_aware(client, mock_prisma: MagicMock) -> None:
    mock_prisma.country.find_unique.return_value = _country()
    mock_prisma.vehicle.find_unique.return_value = _vehicle()

    response = client.post(
        "/v2/public/quotes/rental",
        json={
            "vehicleId": "veh-1",
            "startDate": "2026-04-01",
            "endDate": "2026-05-01",
            "mileagePackage": 3000,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["countryId"] == "country-ae"
    assert body["currencyCode"] == "AED"
    assert body["subtotal"] == 1000.0
    assert body["vatAmount"] == 50.0
    assert body["total"] == 1050.0

