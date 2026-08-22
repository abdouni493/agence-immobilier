import { fileToDataURL } from './utils';
import { supabase } from './supabase';

type Bucket = 'logos' | 'avatars' | 'client-photos';

/** Public Supabase Storage bucket holding the apartment gallery pictures. */
export const APARTMENT_BUCKET = 'apartment-photos';

// Per-bucket downscaling so stored data URLs stay small. Logos/avatars keep PNG
// to preserve transparency; client photos (ID scans) are JPEG to save space.
const BUCKET_OPTS: Record<Bucket, { maxDim: number; mime: 'image/png' | 'image/jpeg'; quality: number }> = {
  logos: { maxDim: 512, mime: 'image/png', quality: 0.92 },
  avatars: { maxDim: 320, mime: 'image/jpeg', quality: 0.85 },
  'client-photos': { maxDim: 1280, mime: 'image/jpeg', quality: 0.82 },
};

/**
 * Compress + downscale an image file into a data URL.
 *
 * The app runs with the Supabase anon key only and no storage bucket is
 * provisioned, so uploading to Supabase Storage fails with "Bucket not found".
 * Instead we inline the image as a (resized) data URL and store it directly in
 * the relevant text column (settings.logo_url, profiles.avatar_url,
 * clients.photo_urls). This is self-contained and needs zero bucket setup.
 */
async function compressToDataURL(
  file: File,
  { maxDim, mime, quality }: { maxDim: number; mime: string; quality: number },
): Promise<string> {
  const dataUrl = await fileToDataURL(file);
  // Non-raster images (e.g. SVG) or anything the browser can't decode: keep as-is.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return dataUrl;
  }
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    // Small enough already and no format change needed → keep original bytes.
    if (scale >= 1 && dataUrl.length < 400_000) return dataUrl;

    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(mime, quality);
  } catch {
    // Decoding failed for some reason — fall back to the raw data URL.
    return dataUrl;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * "Uploads" an image and returns a URL usable in <img src>. Kept as an async
 * function with the original signature so existing callers don't change.
 * Returns an inline data URL (no Supabase Storage bucket required).
 */
export async function uploadImage(
  bucket: Bucket,
  file: File,
  _pathPrefix: string = '',
): Promise<string> {
  return compressToDataURL(file, BUCKET_OPTS[bucket] ?? BUCKET_OPTS['client-photos']);
}

/**
 * No-op for inline data URLs (nothing to remove from remote storage). Kept for
 * API compatibility with callers that expected a storage-backed delete.
 */
export async function deleteImage(_bucket: string, _publicUrl: string): Promise<void> {
  // Inline data URLs live in the record itself; clearing the field removes them.
}

// ═══════════════════════════════════════════════════════════════════════════
//  APARTMENT PHOTOS — real Supabase Storage bucket + aggressive optimisation
// ═══════════════════════════════════════════════════════════════════════════

/** Target weight of one stored apartment photo (~100 KB). */
export const APARTMENT_PHOTO_TARGET_BYTES = 100 * 1024;
/** Longest edge kept for an apartment photo. */
const APARTMENT_PHOTO_MAX_DIM = 1600;

export interface OptimizedImage {
  blob: Blob;
  /** Weight of the original file, in bytes. */
  originalBytes: number;
  /** Weight after optimisation, in bytes. */
  optimizedBytes: number;
  width: number;
  height: number;
}

/**
 * Squeezes a picture down to roughly `targetBytes` (default ~100 KB).
 *
 * Two levers, applied in that order: the longest edge is capped, then the JPEG
 * quality is walked down (0.82 → 0.35) until the encoded blob fits. If quality
 * alone is not enough (very large photos), the canvas is progressively halved.
 * A 10 MB camera shot typically lands around 80–120 KB with no visible loss at
 * screen size.
 */
export async function optimizeImage(
  file: File,
  targetBytes: number = APARTMENT_PHOTO_TARGET_BYTES,
  maxDim: number = APARTMENT_PHOTO_MAX_DIM,
): Promise<OptimizedImage> {
  const originalBytes = file.size;
  const dataUrl = await fileToDataURL(file);
  const img = await loadImage(dataUrl);

  let scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  let best: { blob: Blob; w: number; h: number } | null = null;

  // Up to 4 canvas sizes; each one sweeps the quality ladder.
  for (let pass = 0; pass < 4; pass++) {
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    ctx.drawImage(img, 0, 0, w, h);

    for (const quality of [0.82, 0.7, 0.6, 0.5, 0.42, 0.35]) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (!blob) continue;
      if (!best || blob.size < best.blob.size) best = { blob, w, h };
      if (blob.size <= targetBytes) {
        return { blob, originalBytes, optimizedBytes: blob.size, width: w, height: h };
      }
    }
    scale *= 0.75; // still too heavy → shrink the canvas and try again
  }

  if (best) {
    return {
      blob: best.blob,
      originalBytes,
      optimizedBytes: best.blob.size,
      width: best.w,
      height: best.h,
    };
  }
  // Canvas unavailable (or an exotic format): store the file untouched.
  return {
    blob: file,
    originalBytes,
    optimizedBytes: file.size,
    width: img.width,
    height: img.height,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
}

/**
 * Optimises then uploads one apartment picture to the `apartment-photos`
 * bucket and returns its public URL.
 *
 * The bucket must exist and be public — see the SQL migration shipped with
 * this feature (`supabase_migration_agency_fee_photos_trash.sql`).
 */
export async function uploadApartmentPhoto(
  file: File,
  roomId: string = 'new',
): Promise<{ url: string; originalBytes: number; optimizedBytes: number }> {
  const optimized = await optimizeImage(file);
  const safeId = roomId || 'new';
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${safeId}/${Date.now()}-${rand}.jpg`;

  const { error } = await supabase.storage.from(APARTMENT_BUCKET).upload(path, optimized.blob, {
    contentType: 'image/jpeg',
    upsert: false,
    cacheControl: '31536000',
  });
  if (error) throw error;

  const { data } = supabase.storage.from(APARTMENT_BUCKET).getPublicUrl(path);
  return {
    url: data.publicUrl,
    originalBytes: optimized.originalBytes,
    optimizedBytes: optimized.optimizedBytes,
  };
}

/** Removes one apartment picture from the bucket (ignores unknown URLs). */
export async function deleteApartmentPhoto(publicUrl: string): Promise<void> {
  const marker = `/${APARTMENT_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length).split('?')[0]);
  await supabase.storage.from(APARTMENT_BUCKET).remove([path]);
}

/** "2.4 MB" / "96 KB" — used by the upload feedback in the apartment form. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
