"""Outbox event bus.

Modules emit events via `enqueue()`. A worker process drains pending events,
dispatches to in-process subscribers, exponential backoff on failure.

V1: worker runs in the same Container App as the API. V1.5: split out to a
sidecar Container App when load justifies it.

See docs/architecture/rebuild-erd.md §4.12 for the payload contract:
- Payload is denormalized for subscribers, NOT a snapshot of the source row.
- Hard cap: 8 KB per payload.
- Money fields use {amount_minor, currency_code}.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from origin_backend.core.kernel.ids import new_id
from origin_backend.core.persistence import get_db


@dataclass(frozen=True, slots=True)
class OutboxMessage:
    event_type: str
    aggregate_type: str
    aggregate_id: str
    payload: dict[str, Any]
    country_id: str | None = None
    correlation_id: str | None = None


async def enqueue(message: OutboxMessage) -> None:
    """Persist an event to the outbox. Called from inside a service-layer transaction."""
    db = get_db()
    await db.outboxevent.create(
        data={
            "id": new_id(),
            "countryId": message.country_id,
            "correlationId": message.correlation_id,
            "eventType": message.event_type,
            "aggregateType": message.aggregate_type,
            "aggregateId": message.aggregate_id,
            "payload": message.payload,
        }
    )
