"""Admin API. Mounted at /api/admin/v1. Role-gated by JWT claim."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["admin"])


@router.get("/")
async def root() -> dict[str, str]:
    return {"surface": "admin", "version": "v1"}
