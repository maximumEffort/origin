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


@pytest.fixture
def mock_prisma() -> MagicMock:
    """Return a MagicMock that quacks like a connected Prisma client."""
    mock = MagicMock()
    # Methods we touch in auth/service.py
    mock.otpcode = MagicMock()
    mock.otpcode.delete_many = AsyncMock(return_value=None)
    mock.otpcode.create = AsyncMock(return_value=None)
    mock.otpcode.find_first = AsyncMock(return_value=None)
    mock.otpcode.delete = AsyncMock(return_value=None)
    mock.customer = MagicMock()
    mock.customer.find_unique = AsyncMock(return_value=None)
    mock.customer.create = AsyncMock(return_value=None)
    mock.customer.update = AsyncMock(return_value=None)
    mock.document = MagicMock()
    mock.document.find_first = AsyncMock(return_value=None)
    mock.document.find_many = AsyncMock(return_value=[])
    mock.document.create = AsyncMock(return_value=None)
    mock.document.update = AsyncMock(return_value=None)
    mock.document.count = AsyncMock(return_value=0)
    mock.adminuser = MagicMock()
    mock.adminuser.find_unique = AsyncMock(return_value=None)
    mock.vehicle = MagicMock()
    mock.vehicle.find_many = AsyncMock(return_value=[])
    mock.vehicle.find_unique = AsyncMock(return_value=None)
    mock.vehicle.count = AsyncMock(return_value=0)
    mock.booking = MagicMock()
    mock.booking.find_many = AsyncMock(return_value=[])
    mock.booking.find_unique = AsyncMock(return_value=None)
    mock.booking.create = AsyncMock(return_value=None)
    mock.booking.update = AsyncMock(return_value=None)
    mock.lease = MagicMock()
    mock.lease.find_many = AsyncMock(return_value=[])
    mock.lease.find_unique = AsyncMock(return_value=None)
    mock.lease.create = AsyncMock(return_value=None)
    mock.lease.update = AsyncMock(return_value=None)
    mock.contactinquiry = MagicMock()
    mock.contactinquiry.create = AsyncMock(return_value=None)
    mock.execute_raw = AsyncMock(return_value=None)
    return mock


@pytest_asyncio.fixture
async def client(mock_prisma: MagicMock) -> AsyncIterator[TestClient]:
    """FastAPI test client with a mocked Prisma client wired in."""
    prisma_module._prisma = mock_prisma  # type: ignore[assignment]
    # Import here (after env vars are set) so settings validation passes.
    from origin_backend.main import app

    # NOTE: Do NOT use `with TestClient(app) as c:` Ã¢â‚¬â€ the context manager
    # triggers FastAPI's lifespan, which calls connect_prisma() and
    # overwrites our mock with a real Prisma instance. Bare TestClient
    # skips lifespan entirely, which is what we want for unit tests.
    yield TestClient(app)
    prisma_module._prisma = None  # type: ignore[assignment]
