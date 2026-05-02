"""Re-export rental-specific event constants from core.messaging.events.

Modules consume their event names from here so the namespace lives near the
business logic that emits them.
"""

from __future__ import annotations

from origin_backend.core.messaging.events import (
    BOOKING_CANCELLED,
    BOOKING_CONFIRMED,
    BOOKING_SUBMITTED,
    LEASE_COMPLETED,
    LEASE_MONTHLY_BILLING_DUE,
    LEASE_STARTED,
    LEASE_TERMINATED,
)

__all__ = [
    "BOOKING_SUBMITTED",
    "BOOKING_CONFIRMED",
    "BOOKING_CANCELLED",
    "LEASE_STARTED",
    "LEASE_MONTHLY_BILLING_DUE",
    "LEASE_COMPLETED",
    "LEASE_TERMINATED",
]
