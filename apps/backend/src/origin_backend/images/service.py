"""Azure Blob Storage service for vehicle images.

Uses managed identity (DefaultAzureCredential) in production,
falls back to connection string for local dev.
"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

from origin_backend.config import settings

logger = logging.getLogger(__name__)

CONTAINER_NAME = "vehicle-imagery"


def _get_blob_service_client():
    """Get Azure Blob Service client using managed identity or connection string."""
    try:
        from azure.identity import DefaultAzureCredential
        from azure.storage.blob import BlobServiceClient
    except ImportError as e:
        raise RuntimeError(
            "azure-storage-blob and azure-identity are required. "
            "Install with: pip install azure-storage-blob azure-identity"
        ) from e

    endpoint = settings.azure_storage_blob_endpoint
    if endpoint:
        credential = DefaultAzureCredential()
        return BlobServiceClient(account_url=endpoint, credential=credential)

    # Fallback: connection string for local dev
    conn_str = getattr(settings, "azure_storage_connection_string", None)
    if conn_str:
        return BlobServiceClient.from_connection_string(conn_str)

    raise RuntimeError(
        "Set AZURE_STORAGE_BLOB_ENDPOINT (production) or "
        "AZURE_STORAGE_CONNECTION_STRING (local dev)"
    )


async def upload_image(content: bytes, blob_name: str, content_type: str) -> str:
    """Upload image bytes to Azure Blob Storage. Returns the public URL."""
    client = _get_blob_service_client()
    blob_client = client.get_blob_client(container=CONTAINER_NAME, blob=blob_name)

    blob_client.upload_blob(
        content,
        content_type=content_type,
        overwrite=True,
    )

    url = blob_client.url
    logger.info("Uploaded image: %s", url)
    return url


async def delete_image(url: str) -> None:
    """Delete an image from Azure Blob Storage by its URL."""
    try:
        parsed = urlparse(url)
        # URL format: https://saoriginprod.blob.core.windows.net/vehicle-imagery/xxx/yyy.jpg
        path_parts = parsed.path.lstrip("/").split("/", 1)
        if len(path_parts) < 2:
            logger.warning("Could not parse blob path from URL: %s", url)
            return

        blob_name = path_parts[1]  # everything after container name
        client = _get_blob_service_client()
        blob_client = client.get_blob_client(container=CONTAINER_NAME, blob=blob_name)
        blob_client.delete_blob()
        logger.info("Deleted image: %s", blob_name)
    except Exception as e:
        logger.error("Failed to delete blob %s: %s", url, e)


async def update_image_meta(
    db: Any,
    vehicle_id: str,
    image_id: str,
    is_primary: bool | None,
    sort_order: int | None,
) -> dict[str, Any]:
    """Update image metadata. If setting primary, unset others first."""
    data: dict[str, Any] = {}

    if is_primary is True:
        # Unset all other primaries for this vehicle
        await db.execute_raw(
            'UPDATE vehicle_images SET "isPrimary" = false WHERE "vehicleId" = $1 AND id != $2',
            vehicle_id,
            image_id,
        )
        data["isPrimary"] = True
    elif is_primary is False:
        data["isPrimary"] = False

    if sort_order is not None:
        data["sortOrder"] = sort_order

    if data:
        updated = await db.vehicleimage.update(
            where={"id": image_id},
            data=data,
        )
        return {
            "id": updated.id,
            "url": updated.url,
            "isPrimary": updated.isPrimary,
            "sortOrder": updated.sortOrder,
        }

    image = await db.vehicleimage.find_unique(where={"id": image_id})
    return {
        "id": image.id,
        "url": image.url,
        "isPrimary": image.isPrimary,
        "sortOrder": image.sortOrder,
    }
