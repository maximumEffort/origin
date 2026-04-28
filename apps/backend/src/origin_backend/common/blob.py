"""
Azure Blob Storage upload helper for KYC documents.

Supports two modes:
- Azure Blob (production on Azure): when AZURE_STORAGE_BLOB_ENDPOINT is configured
  AND the azure-storage-blob + azure-identity packages are installed.
- Local filesystem (Railway / dev): saves to KYC_UPLOAD_DIR and serves via /uploads/.

All Azure imports are lazy and wrapped in try/except so this module is
import-safe even when the azure-* optional dependencies aren't installed.
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from origin_backend.config import settings

logger = logging.getLogger(__name__)

KYC_CONTAINER = "kyc-documents"

# Set at first call to _check_azure_available(); None means "not checked yet".
_azure_available: bool | None = None


def _check_azure_available() -> bool:
    """Return True if Azure Blob SDK is importable AND an endpoint is configured."""
    global _azure_available
    if _azure_available is not None:
        return _azure_available

    if not settings.azure_storage_blob_endpoint:
        _azure_available = False
        logger.info("AZURE_STORAGE_BLOB_ENDPOINT not set — KYC uploads will use local filesystem")
        return False

    try:
        import azure.identity.aio
        import azure.storage.blob.aio  # noqa: F401
    except ImportError:
        _azure_available = False
        logger.warning(
            "AZURE_STORAGE_BLOB_ENDPOINT is set but azure-storage-blob / azure-identity "
            "are not installed.  Falling back to local filesystem.  Install the 'azure' "
            "extra to enable blob uploads:  uv sync --extra azure"
        )
        return False

    _azure_available = True
    logger.info(
        "Azure Blob Storage configured — KYC uploads will go to %s",
        settings.azure_storage_blob_endpoint,
    )
    return True


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

    When Azure Blob is available (endpoint + SDK), uploads there.
    Otherwise, saves to the local filesystem under KYC_UPLOAD_DIR and
    returns a relative /uploads/… path that the static-file mount serves.
    """
    file_id = uuid.uuid4().hex[:12]
    blob_name = f"{customer_id}/{doc_type.lower()}_{file_id}{file_extension}"

    if _check_azure_available():
        return await _upload_to_azure(blob_name, file_content, content_type)
    return _save_locally(blob_name, file_content)


async def _upload_to_azure(blob_name: str, content: bytes, content_type: str) -> str:
    """Upload to Azure Blob Storage using DefaultAzureCredential."""
    try:
        from azure.identity.aio import DefaultAzureCredential
        from azure.storage.blob.aio import BlobServiceClient
    except ImportError as e:
        raise RuntimeError(
            "Azure Blob upload requested but azure-storage-blob / azure-identity "
            "are not installed.  Run:  uv sync --extra azure"
        ) from e

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
    """Fallback — write to the local uploads directory."""
    upload_dir = Path(settings.kyc_upload_dir) / KYC_CONTAINER
    file_path = upload_dir / blob_name
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(content)
    logger.info("Saved KYC doc locally: %s", file_path)
    return f"/uploads/{KYC_CONTAINER}/{blob_name}"
