/**
 * Vehicle image management — admin API client.
 *
 * Backend: /v1/admin/vehicles/:id/images
 * Storage: Azure Blob (container `vehicle-imagery`).
 */

import { apiRequest } from './api';

export interface VehicleImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export async function listVehicleImages(vehicleId: string): Promise<VehicleImage[]> {
  return apiRequest<VehicleImage[]>(`/admin/vehicles/${vehicleId}/images`);
}

export async function uploadVehicleImage(
  vehicleId: string,
  file: File,
): Promise<VehicleImage> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`/api/backend/admin/vehicles/${vehicleId}/images`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.detail ?? error?.message ?? `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function updateVehicleImage(
  vehicleId: string,
  imageId: string,
  patch: { isPrimary?: boolean; sortOrder?: number },
): Promise<VehicleImage> {
  return apiRequest<VehicleImage>(`/admin/vehicles/${vehicleId}/images/${imageId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteVehicleImage(
  vehicleId: string,
  imageId: string,
): Promise<void> {
  const res = await fetch(`/api/backend/admin/vehicles/${vehicleId}/images/${imageId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.detail ?? `Delete failed (${res.status})`);
  }
}
