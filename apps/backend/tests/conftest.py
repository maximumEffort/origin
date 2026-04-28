"""
Shared pytest fixtures.

Notes for new contributors:
  - We don't connect to a real Postgres in unit tests. Each test mocks the
    Prisma client via AsyncMock, so test runs stay millisecond-fast and
    don't need any infrastructure.
  - For end-to-end tests (the Node backend has 16 of these), we'd want a
    spun-up test database. Tracked separately.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

# Point pydantic-settings at a sentinel test value BEFORE importing app code.
os.environ.setdefault("JWT_SECRET", "test-secret-must-be-at-least-16-chars-long")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from origin_backend.common import prisma as prisma_module


def _model_mock(**defaults: object) -> MagicMock:
    """
    Build a model namespace where every Prisma method is an AsyncMock.
    Keeps tests resilient: any call we don't override still resolves to an
    awaitable (instead of returning a plain MagicMock that explodes when
    awaited inside `asyncio.gather`).
    """
    m = MagicMock()
    method_defaults: dict[str, object] = {
        "find_unique": None,
        "find_first": None,
        "find_many": [],
        "count": 0,
        "create": None,
        "create_many": None,
        "update": None,
        "update_many": None,
        "delete": None,
        "delete_many": None,
    }
    method_defaults.update(defaults)
    for name, val in method_defaults.items():
        setattr(m, name, AsyncMock(return_value=val))
    return m


@pytest.fixture
def mock_prisma() -> MagicMock:
    """Return a MagicMock that quacks like a connected Prisma client."""
    mock = MagicMock()
    mock.otpcode = _model_mock()
    mock.customer = _model_mock()
    mock.document = _model_mock()
    mock.adminuser = _model_mock()
    mock.vehicle = _model_mock()
    mock.vehiclecategory = _model_mock()
    mock.booking = _model_mock()
    mock.lease = _model_mock()
    mock.payment = _model_mock()
    mock.contactinquiry = _model_mock()
    mock.auditlog = _model_mock()
    mock.execute_raw = AsyncMock(return_value=None)
    return mock


@pytest_asyncio.fixture
async def client(mock_prisma: MagicMock) -> AsyncIterator[TestClient]:
    """FastAPI test client with a mocked Prisma client wired in."""
    prisma_module._prisma = mock_prisma  # type: ignore[assignment]
    # Import here (after env vars are set) so settings validation passes.
    from origin_backend.main import app

    # NOTE: Do NOT use `with TestClient(app) as c:` — the context manager
    # triggers FastAPI's lifespan, which calls connect_prisma() and
    # overwrites our mock with a real Prisma instance. Bare TestClient
    # skips lifespan entirely, which is what we want for unit tests.
    yield TestClient(app)
    prisma_module._prisma = None  # type: ignore[assignment]
