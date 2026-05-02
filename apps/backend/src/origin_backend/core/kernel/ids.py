"""ULID generation. All primary keys in the system use these."""

from __future__ import annotations

from ulid import ULID


def new_id() -> str:
    return str(ULID())
