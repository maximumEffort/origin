'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Star, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import {
  VehicleImage,
  listVehicleImages,
  uploadVehicleImage,
  updateVehicleImage,
  deleteVehicleImage,
} from '@/lib/api-images';

interface Props {
  vehicleId: string;
}

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 10 * 1024 * 1024;

export default function VehicleImageManager({ vehicleId }: Props) {
  const [images, setImages] = useState<VehicleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setError('');
      const data = await listVehicleImages(vehicleId);
      setImages(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          throw new Error(`${file.name} exceeds 10MB limit`);
        }
        await uploadVehicleImage(vehicleId, file);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const setPrimary = async (imageId: string) => {
    setError('');
    try {
      await updateVehicleImage(vehicleId, imageId, { isPrimary: true });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary');
    }
  };

  const remove = async (imageId: string) => {
    setError('');
    try {
      await deleteVehicleImage(vehicleId, imageId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const reorder = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    setError('');
    const a = images[index];
    const b = images[target];
    try {
      await updateVehicleImage(vehicleId, a.id, { sortOrder: b.sortOrder });
      await updateVehicleImage(vehicleId, b.id, { sortOrder: a.sortOrder });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Vehicle Images
        </h4>
        <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand bg-brand-light rounded-lg cursor-pointer hover:bg-brand-light/70 transition-colors">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
          {uploading ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload size={12} /> Add Images
            </>
          )}
        </label>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading images...
        </div>
      ) : images.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg py-8 text-center text-sm text-gray-400">
          No images yet. JPEG, PNG, or WebP up to 10MB.
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Vehicle image ${idx + 1}`}
                className="w-full h-24 object-cover"
              />
              {img.isPrimary && (
                <span className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-white bg-gold rounded">
                  <Star size={10} /> Primary
                </span>
              )}
              {/* #139 §7 — overlay also reveals on keyboard focus, not only
                  hover. Buttons get aria-label so screen readers announce them
                  even when the icon is the only visible content. */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(img.id)}
                    aria-label="Set as primary"
                    className="p-1.5 bg-white rounded-md text-gray-700 hover:text-gold transition-colors"
                  >
                    <Star size={12} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => reorder(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move image up"
                  className="p-1.5 bg-white rounded-md text-gray-700 hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => reorder(idx, 1)}
                  disabled={idx === images.length - 1}
                  aria-label="Move image down"
                  className="p-1.5 bg-white rounded-md text-gray-700 hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  aria-label="Delete image"
                  className="p-1.5 bg-white rounded-md text-gray-700 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
