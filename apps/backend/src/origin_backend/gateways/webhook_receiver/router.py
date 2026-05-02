"""Inbound webhooks. Mounted at /api/webhooks/{provider}. Unversioned —
provider owns the shape. Each handler verifies the provider's signature."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["webhooks"])


@router.get("/")
async def root() -> dict[str, str]:
    return {"surface": "webhooks"}
