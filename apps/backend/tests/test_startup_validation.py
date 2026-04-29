"""
Tests for startup-time configuration guards in main.py.

These guards refuse to start the app when an environment is misconfigured
in a way that would otherwise fail silently with catastrophic consequences
(e.g. KYC documents exposed publicly — see #130).
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from origin_backend.main import validate_startup_settings


def _settings(**overrides: object) -> SimpleNamespace:
    base = {
        "jwt_secret": "test-secret-must-be-at-least-16-chars-long",
        "is_production": False,
        "azure_storage_blob_endpoint": None,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_jwt_secret_too_short_refuses_to_start():
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_startup_settings(_settings(jwt_secret="short"))


def test_production_without_azure_blob_refuses_to_start():
    """#130 — fail-open guard: production must not fall back to local /uploads."""
    with pytest.raises(RuntimeError, match="AZURE_STORAGE_BLOB_ENDPOINT"):
        validate_startup_settings(_settings(is_production=True, azure_storage_blob_endpoint=None))


def test_production_with_azure_blob_starts():
    validate_startup_settings(
        _settings(
            is_production=True,
            azure_storage_blob_endpoint="https://storage.test.net/",
        )
    )


def test_dev_without_azure_blob_starts():
    """Dev / staging must keep working without Azure Blob (local /uploads is fine there)."""
    validate_startup_settings(_settings(is_production=False, azure_storage_blob_endpoint=None))
