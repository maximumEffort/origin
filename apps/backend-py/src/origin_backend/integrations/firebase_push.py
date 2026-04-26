"""
Firebase Cloud Messaging integration — push notifications.

Mirrors apps/backend/src/integrations/firebase/firebase.service.ts.

Initialised lazily on first use; re-uses the global firebase_admin app
state (the Admin SDK is process-global, not request-scoped).

If FIREBASE_SERVICE_ACCOUNT_JSON is unset or unparseable, every send is
a clean no-op — same as the Node service.

The Firebase Admin SDK is sync; sends hop to a worker thread via
`asyncio.to_thread` so the event loop keeps moving. All failures are
caught and logged — a stale FCM token must never fail a request handler.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any

import firebase_admin
from firebase_admin import credentials, messaging

from origin_backend.config import settings

logger = logging.getLogger(__name__)

_FCM_BATCH_SIZE = 500  # Multicast cap per Meta/FCM docs.

_initialised: bool | None = None  # None = not attempted, True = ok, False = failed


@dataclass(frozen=True)
class PushNotification:
    token: str
    title: str
    body: str
    data: dict[str, str] | None = None
    image_url: str | None = None


@dataclass(frozen=True)
class TopicNotification:
    topic: str
    title: str
    body: str
    data: dict[str, str] | None = None


def _init() -> bool:
    """Initialise the Admin SDK on first use; idempotent."""
    global _initialised
    if _initialised is not None:
        return _initialised
    if firebase_admin._apps:  # already initialised by another caller
        _initialised = True
        return True

    raw = settings.firebase_service_account_json
    if not raw:
        logger.warning("FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled")
        _initialised = False
        return False

    try:
        cred = credentials.Certificate(json.loads(raw))
        firebase_admin.initialize_app(cred)
        _initialised = True
        logger.info("Firebase Admin SDK initialised")
        return True
    except Exception as e:
        logger.error("Firebase init failed: %s", e)
        _initialised = False
        return False


def is_configured() -> bool:
    return _init()


async def send_to_device(notification: PushNotification) -> None:
    """Send a push notification to a single FCM token."""
    if not _init():
        return

    message = messaging.Message(
        token=notification.token,
        notification=messaging.Notification(
            title=notification.title,
            body=notification.body,
            image=notification.image_url,
        ),
        data=notification.data or {},
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(sound="default"),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound="default", badge=1),
            )
        ),
    )

    try:
        response = await asyncio.to_thread(messaging.send, message)
        logger.info("Push sent: %s", response)
    except Exception as e:
        logger.error("Push failed for token %s...: %s", notification.token[:20], e)


async def send_to_devices(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> None:
    """Multicast push — splits into 500-token batches per FCM limit."""
    if not _init() or not tokens:
        return

    for i in range(0, len(tokens), _FCM_BATCH_SIZE):
        batch = tokens[i : i + _FCM_BATCH_SIZE]
        message = messaging.MulticastMessage(
            tokens=batch,
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(sound="default"),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(aps=messaging.Aps(sound="default")),
            ),
        )
        try:
            result = await asyncio.to_thread(messaging.send_each_for_multicast, message)
            logger.info(
                "Batch push: %s sent, %s failed", result.success_count, result.failure_count
            )
        except Exception as e:
            logger.error("Batch push failed: %s", e)


async def send_to_topic(notification: TopicNotification) -> None:
    """Send to all devices subscribed to a topic."""
    if not _init():
        return

    message = messaging.Message(
        topic=notification.topic,
        notification=messaging.Notification(title=notification.title, body=notification.body),
        data=notification.data or {},
    )
    try:
        await asyncio.to_thread(messaging.send, message)
        logger.info("Topic push sent: %s", notification.topic)
    except Exception as e:
        logger.error("Topic push failed: %s", e)


async def subscribe_to_topic(tokens: list[str], topic: str) -> Any:
    if not _init():
        return None
    return await asyncio.to_thread(messaging.subscribe_to_topic, tokens, topic)


async def unsubscribe_from_topic(tokens: list[str], topic: str) -> Any:
    if not _init():
        return None
    return await asyncio.to_thread(messaging.unsubscribe_from_topic, tokens, topic)


def _reset_for_tests() -> None:
    """Test helper — reset the lazy-init memo so tests can re-stub config."""
    global _initialised
    _initialised = None
