"""
Azure Blob Storage upload helper for KYC documents.

Supports two modes:
- Azure Blob (production): when AZURE_STORAGE_BLOB_ENDPOINT is configured
- Local filesystem (dev): saves to KYC_UPLOAD_DIR and serves via /uploads/
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from origin_backend.config import settings

logger = logging.getLogger(__name__)

KYC_CONTAINER = "kyc-documents"


async def upload_kyc_document(
    *,
    customer_id: str,
    doc_type: str,
    file_content: bytes,
    content_type: str,
    file_extension: str,
) -> str:
    """
    Upload a KYC document file and return its URL.

    In production (AZURE_STORAGE_BLOB_ENDPOINT set), uploads to Azure Blob
    Storage in the kyc-documents container.  In development, saves to the
    local filesystem under KYC_UPLOAD_DIR and returns a path that the dev
    server can serve via the /uploads static mount.
    """
    file_id = uuid.uuid4().hex[:12]
    blob_name = f"{customer_id}/{doc_type.lower()}_{file_id}{file_extension}"

    if settings.azure_storage_blob_endpoint:
        return await _upload_to_azure(blob_name, file_content, content_type)
    return _save_locally(blob_name, file_content)


async def _upload_to_azure(blob_name: str, content: bytes, content_type: str) -> str:
    """Upload to Azure Blob Storage using DefaultAzureCredential."""
    from azure.identity.aio import DefaultAzureCredential
    from azure.storage.blob.aio import BlobServiceClient

    credential = DefaultAzureCredential()
    try:
        client = BlobServiceClient(
            account_url=settings.azure_storage_blob_endpoint,
            credential=credential,
        )
        async with client:
            container = client.get_container_client(KYC_CONTAINER)
            try:
                await container.create_container()
            except Exception:
                pass  # Already exists

            blob = container.get_blob_client(blob_name)
            await blob.upload_blob(content, content_type=content_type, overwrite=True)
            logger.info("Uploaded KYC doc to Azure Blob: %s/%s", KYC_CONTAINER, blob_name)
            return blob.url
    finally:
        await credential.close()


def _save_locally(blob_name: str, content: bytes) -> str:
    """Dev fallback — write to the local uploads directory."""
    upload_dir = Path(settings.kyc_upload_dir) / KYC_CONTAINER
    file_path = upload_dir / blob_name
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(content)
    logger.info("Saved KYC doc locally: %s", file_path)
    return f"/uploads/{KYC_CONTAINER}/{blob_name}"
