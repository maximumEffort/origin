"""Transactional outbox helpers.

Domain services call this inside the same database transaction as their state
change. A worker can later process `outbox_events` without losing side effects.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any


@dataclass(frozen=True)
class OutboxMessage:
    event_type: str
    aggregate_type: str
    aggregate_id: str
    payload: dict[str, Any]
    country_id: str | None = None


async def enqueue(db: Any, message: OutboxMessage) -> Any:
    return await db.outboxevent.create(
        data={
            "countryId": message.country_id,
            "eventType": message.event_type,
            "aggregateType": message.aggregate_type,
            "aggregateId": message.aggregate_id,
            "payload": message.payload,
            "status": "PENDING",
            "availableAt": datetime.now(UTC),
        }
    )


def event_payload(**values: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for key, value in values.items():
        if hasattr(value, "isoformat"):
            payload[key] = value.isoformat()
        elif hasattr(value, "__dataclass_fields__"):
            payload[key] = asdict(value)
        else:
            payload[key] = value
    return payload

