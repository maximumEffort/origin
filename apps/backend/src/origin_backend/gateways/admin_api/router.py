"""Admin modular API routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from origin_backend.common.auth import require_admin
from origin_backend.common.prisma import get_db

router = APIRouter(prefix="/admin/v2", tags=["admin-api"])


@router.get("/countries")
async def list_countries_endpoint(
    _=Depends(require_admin("SUPER_ADMIN", "FINANCE")),
    db: Any = Depends(get_db),
) -> list[Any]:
    countries = await db.country.find_many(
        include={"legalEntities": True, "kycDocumentTypes": True},
        order={"name": "asc"},
    )
    return countries

