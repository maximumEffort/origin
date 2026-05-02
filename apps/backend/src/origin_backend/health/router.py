"""Liveness + readiness endpoints. Hit by Azure Container Apps probes."""

from __future__ import annotations

from fastapi import APIRouter

from origin_backend.core.persistence import is_prisma_connected

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "alive"}


@router.get("/health/ready")
async def ready() -> dict[str, str]:
    if not is_prisma_connected():
        return {"status": "starting"}
    return {"status": "ready"}
