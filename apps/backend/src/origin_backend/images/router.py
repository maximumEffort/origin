"""Vehicle image upload/management endpoints.

Uses Azure Blob Storage for image persistence.
Images are publicly accessible via blob URL.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from origin_backend.common.auth import require_admin
from origin_backend.common.prisma import get_db
from origin_backend.images.service import delete_image, update_image_meta, upload_image
from prisma import Prisma

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/vehicles", tags=["vehicle-images"])


class UpdateImageRequest(BaseModel):
    isPrimary: bool | None = None
    sortOrder: int | None = None


@router.post("/{vehicle_id}/images", status_code=status.HTTP_201_CREATED)
async def upload_vehicle_image(
    vehicle_id: str,
    file: UploadFile = File(...),
    _=Depends(require_admin("SUPER_ADMIN", "FLEET_MANAGER")),
    db: Prisma = Depends(get_db),
) -> dict[str, Any]:
    """Upload an image for a vehicle. First image is auto-set as primary."""
    vehicle = await db.vehicle.find_unique(where={"id": vehicle_id})
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")

    # Check if this is the first image (auto-primary)
    existing_count = await db.vehicleimage.count(where={"vehicleId": vehicle_id})
    is_primary = existing_count == 0

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image must be under 10MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "jpg"
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    blob_name = f"{vehicle_id}/{uuid.uuid4().hex}.{ext}"

    url = await upload_image(content, blob_name, file.content_type or "image/jpeg")

    image = await db.vehicleimage.create(
        data={
            "vehicleId": vehicle_id,
            "url": url,
            "isPrimary": is_primary,
            "sortOrder": existing_count,
        }
    )

    return {
        "id": image.id,
        "url": image.url,
        "isPrimary": image.isPrimary,
        "sortOrder": image.sortOrder,
    }


@router.patch("/{vehicle_id}/images/{image_id}")
async def update_vehicle_image(
    vehicle_id: str,
    image_id: str,
    body: UpdateImageRequest,
    _=Depends(require_admin("SUPER_ADMIN", "FLEET_MANAGER")),
    db: Prisma = Depends(get_db),
) -> dict[str, Any]:
    """Update image metadata (set primary, reorder)."""
    image = await db.vehicleimage.find_first(where={"id": image_id, "vehicleId": vehicle_id})
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")

    result = await update_image_meta(db, vehicle_id, image_id, body.isPrimary, body.sortOrder)
    return result


@router.delete("/{vehicle_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle_image(
    vehicle_id: str,
    image_id: str,
    _=Depends(require_admin("SUPER_ADMIN", "FLEET_MANAGER")),
    db: Prisma = Depends(get_db),
) -> None:
    """Delete a vehicle image from Blob Storage and database."""
    image = await db.vehicleimage.find_first(where={"id": image_id, "vehicleId": vehicle_id})
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")

    await delete_image(image.url)
    await db.vehicleimage.delete(where={"id": image_id})

    # If deleted image was primary, promote next one
    if image.isPrimary:
        next_img = await db.vehicleimage.find_first(
            where={"vehicleId": vehicle_id},
            order={"sortOrder": "asc"},
        )
        if next_img:
            await db.vehicleimage.update(
                where={"id": next_img.id},
                data={"isPrimary": True},
            )


@router.get("/{vehicle_id}/images")
async def list_vehicle_images(
    vehicle_id: str,
    _=Depends(require_admin("SUPER_ADMIN", "FLEET_MANAGER", "SALES", "FINANCE")),
    db: Prisma = Depends(get_db),
) -> list[dict[str, Any]]:
    """List all images for a vehicle."""
    images = await db.vehicleimage.find_many(
        where={"vehicleId": vehicle_id},
        order={"sortOrder": "asc"},
    )
    return [
        {"id": img.id, "url": img.url, "isPrimary": img.isPrimary, "sortOrder": img.sortOrder}
        for img in images
    ]
