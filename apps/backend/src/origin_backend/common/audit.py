"""
Audit logging helper.

Writes to the AuditLog table for every admin mutation. Fire-and-forget:
if the audit write fails we log the error but never block the request.
"""

from __future__ import annotations

import logging
from typing import Any

from prisma import Prisma

logger = logging.getLogger(__name__)


async def log_action(
    db: Prisma,
    *,
    user_id: str,
    user_type: str = "ADMIN",
    action: str,
    entity_type: str,
    entity_id: str,
    old_value: Any | None = None,
    new_value: Any | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Write one row to audit_logs. Never raises — errors are logged."""
    try:
        await db.auditlog.create(
            data={
                "userId": user_id,
                "userType": user_type,
                "action": action,
                "entityType": entity_type,
                "entityId": entity_id,
                "oldValue": old_value,
                "newValue": new_value,
                "ipAddress": ip_address,
                "userAgent": user_agent,
                "metadata": metadata,
            }
        )
    except Exception:
        logger.exception(
            "Failed to write audit log: action=%s entity=%s/%s user=%s",
            action,
            entity_type,
            entity_id,
            user_id,
        )
