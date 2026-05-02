"""Public-facing customer API. Mounted at /api/v1.

V1 scope: rental product. Other product modules (lease_to_own, purchase) will
mount their own sub-routers here when their licences land.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["public"])


@router.get("/")
async def root() -> dict[str, str]:
    """Marker endpoint so smoke checks can verify the public API is mounted."""
    return {"surface": "public", "version": "v1"}
