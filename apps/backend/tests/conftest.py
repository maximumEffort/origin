"""Pytest configuration. Fixtures live here."""

from __future__ import annotations

import os

# Test env defaults — override via env vars in CI if needed.
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_SECRET", "test-secret-min-16-characters-long")
os.environ.setdefault("DATABASE_URL", "postgresql://origin:origin@localhost:5432/origin_test")
