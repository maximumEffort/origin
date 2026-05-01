"""Small, stable domain types used across module boundaries."""

from __future__ import annotations

from decimal import Decimal
from enum import StrEnum
from typing import NewType

CountryCode = NewType("CountryCode", str)
CurrencyCode = NewType("CurrencyCode", str)
Money = Decimal
TaxRate = Decimal


class Language(StrEnum):
    en = "en"
    ar = "ar"
    zh = "zh"


class ProductType(StrEnum):
    rental = "rental"
    purchase = "purchase"
    lease_to_own = "lease_to_own"
    fleet_b2b = "fleet_b2b"

