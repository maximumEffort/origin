"""Composition root dependencies for the modular API."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, Header

from origin_backend.common.prisma import get_db
from origin_backend.platform.countries.service import DEFAULT_COUNTRY_CODE, get_active_country


async def get_country(
    x_origin_country: str | None = Header(default=None, alias="X-Origin-Country"),
    db: Any = Depends(get_db),
) -> Any:
    return await get_active_country(db, x_origin_country or DEFAULT_COUNTRY_CODE)

