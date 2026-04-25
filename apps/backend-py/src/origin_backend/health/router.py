"""
Health check endpoints.

Mirrors the Node backend (apps/backend/src/health/) so monitoring + the
Vercel/admin status pages don't notice the swap.

Three endpoints:
    GET /health        — full check (DB + memory + uptime)
    GET /health/live   — liveness (process is running)
    GET /health/ready  — readiness (DB reachable)
"""

from __future__ import annotations

import os
import time
from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from prisma import Prisma

from origin_backend.common.prisma import get_db

router = APIRouter(prefix="/health", tags=["health"])

_started_at = time.time()


@router.get("/live")
async def live() -> dict[str, Any]:
    """Liveness probe — returns 200 as long as the process is responsive."""
    return {"status": "alive", "uptime_seconds": int(time.time() - _started_at)}


@router.get("/ready")
async def ready(db: Prisma = Depends(get_db)) -> JSONResponse:
    """Readiness probe — verifies the database is reachable."""
    try:
        # Cheapest possible round-trip query
        await db.execute_raw("SELECT 1")
        return JSONResponse(status_code=200, content={"status": "ready"})
    except Exception as e:  # noqa: BLE001 — we want any DB error to return 503
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unready", "error": "database_unreachable"},
        )


@router.get("")
async def full_health(db: Prisma = Depends(get_db)) -> JSONResponse:
    """Full health check with detail. Used by the admin status page."""
    db_status = "up"
    db_latency_ms: int | None = None
    try:
        t0 = time.perf_counter()
        await db.execute_raw("SELECT 1")
        db_latency_ms = int((time.perf_counter() - t0) * 1000)
    except Exception:  # noqa: BLE001
        db_status = "down"

    overall = "healthy" if db_status == "up" else "degraded"
    http_status = 200 if db_status == "up" else 503

    return JSONResponse(
        status_code=http_status,
        content={
            "status": overall,
            "uptime_seconds": int(time.time() - _started_at),
            "version": os.getenv("APP_VERSION", "0.1.0"),
            "checks": {
                "database": {
                    "status": db_status,
                    "latency_ms": db_latency_ms,
                }
            },
        },
    )
