"""Static schema checks for the enterprise country foundation."""

from __future__ import annotations

from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[1] / "prisma" / "schema.prisma"
MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "prisma"
    / "migrations"
    / "20260502_enterprise_country_foundation"
    / "migration.sql"
)


def _model_block(schema: str, model: str) -> str:
    start = schema.index(f"model {model} {{")
    end = schema.index("\n}", start)
    return schema[start:end]


def test_country_foundation_models_exist() -> None:
    schema = SCHEMA.read_text(encoding="utf-8")
    for model in ["model Country", "model LegalEntity", "model KycDocumentType", "model OutboxEvent"]:
        assert model in schema


def test_country_scoped_models_require_country_id() -> None:
    schema = SCHEMA.read_text(encoding="utf-8")
    for model in ["Vehicle", "Customer", "Booking", "Lease", "Payment", "Invoice"]:
        block = _model_block(schema, model)
        assert "countryId" in block
        assert "Country" in block


def test_financial_records_snapshot_currency_code() -> None:
    schema = SCHEMA.read_text(encoding="utf-8")
    for model in ["Vehicle", "Booking", "Lease", "Payment", "Invoice"]:
        assert "currencyCode" in _model_block(schema, model)


def test_uae_seed_exists_in_migration() -> None:
    migration = MIGRATION.read_text(encoding="utf-8")
    assert "'country-ae'" in migration
    assert "'AE'" in migration
    assert "'AED'" in migration
    assert "Shanghai Car Rental LLC" in migration
    for code in ["EMIRATES_ID", "DRIVING_LICENCE", "PASSPORT", "VISA"]:
        assert code in migration
