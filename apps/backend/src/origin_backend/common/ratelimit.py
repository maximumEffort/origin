"""
In-memory sliding-window rate limiter.

Per-key buckets (key = IP, phone number, etc.). Sufficient for the
single-replica Container Apps deployment we run today. To scale across
replicas, replace ``_BUCKETS`` with a Redis sorted set keyed identically
— callers don't need to change.

Usage as a FastAPI dependency:

    @router.post("/admin/login")
    async def login(
        body: AdminLoginRequest,
        _ = Depends(rate_limit_by_ip("admin-login", limit=5, window_seconds=60)),
    ): ...

For per-body-field limits (e.g. OTP per phone), call ``check_rate_limit``
directly from inside the handler, after parsing the body.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from collections.abc import Callable
from threading import Lock

from fastapi import HTTPException, Request, status

# bucket = key → deque of recent hit timestamps (monotonic seconds)
_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
_LOCK = Lock()


def _client_ip(request: Request) -> str:
    """Best-effort client IP. Honour X-Forwarded-For from the front proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(
    key: str,
    *,
    limit: int,
    window_seconds: int,
) -> None:
    """Raise HTTP 429 if ``key`` has exceeded ``limit`` hits in the past
    ``window_seconds``. Otherwise records the hit and returns silently."""
    now = time.monotonic()
    cutoff = now - window_seconds

    with _LOCK:
        bucket = _BUCKETS[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= limit:
            oldest = bucket[0]
            retry_after = max(1, int(window_seconds - (now - oldest)) + 1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests, please slow down.",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)


def rate_limit_by_ip(
    bucket_name: str,
    *,
    limit: int,
    window_seconds: int,
) -> Callable[[Request], None]:
    """FastAPI dependency factory: limits a route by client IP."""

    def _dep(request: Request) -> None:
        ip = _client_ip(request)
        check_rate_limit(
            f"{bucket_name}:ip:{ip}",
            limit=limit,
            window_seconds=window_seconds,
        )

    return _dep


def reset_buckets() -> None:
    """Test helper: clear all buckets between tests."""
    with _LOCK:
        _BUCKETS.clear()
