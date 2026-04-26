"""
Contact business logic.

Mirrors apps/backend/src/contact/contact.service.ts. Stores the inquiry
and returns the new id; no email is sent yet (the Node service only
logs). Outbound notification can layer on with the SendGrid integration.
"""

from __future__ import annotations

import logging

from prisma import Prisma

logger = logging.getLogger(__name__)


async def create(
    db: Prisma,
    *,
    name: str,
    email: str,
    phone: str | None,
    subject: str | None,
    message: str,
) -> dict[str, object]:
    """Persist a contact inquiry and return its id."""
    inquiry = await db.contactinquiry.create(
        data={
            "name": name,
            "email": email,
            "phone": phone,
            "subject": subject,
            "message": message,
        }
    )
    logger.info("New contact inquiry %s from %s", inquiry.id, email)
    return {"id": inquiry.id, "received": True}
