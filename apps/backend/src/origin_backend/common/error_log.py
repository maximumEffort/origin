"""
ErrorLog helper.

Persists unhandled exceptions to the error_logs table for post-mortem
analysis. Fire-and-forget — if the DB write fails we still log to stdout
but never break the user-facing 500 response.
"""

from __future__ import annotations

import logging
from typing import Any

from prisma import Prisma

logger = logging.getLogger(__name__)


async def log_error(
    db: Prisma,
    *,
    level: str = "ERROR",
    message: str,
    stack_trace: str | None = None,
    endpoint: str | None = None,
    method: str | None = None,
    status_code: int | None = None,
    user_id: str | None = None,
    request_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Write one row to error_logs. Never raises — errors are logged."""
    try:
        await db.errorlog.create(
            data={
                "level": level,
                "message": message,
                "stackTrace": stack_trace,
                "endpoint": endpoint,
                "method": method,
                "statusCode": status_code,
                "userId": user_id,
                "requestId": request_id,
                "metadata": metadata or {},
            }
        )
    except Exception:
        logger.exception(
            "Failed to write error log: endpoint=%s method=%s requestId=%s",
            endpoint,
            method,
            request_id,
        )
