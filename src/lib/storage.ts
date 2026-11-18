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

/** Target weight of one stored apartment photo (~60 KB). */
export const APARTMENT_PHOTO_TARGET_BYTES = 60 * 1024;
/** Longest edge kept for an apartment photo (sharp on any screen, light). */
const APARTMENT_PHOTO_MAX_DIM = 1280;
/** Smallest longest edge the optimiser may shrink a photo to. */
const APARTMENT_PHOTO_MIN_DIM = 960;

export interface OptimizedImage {
  blob: Blob;
  /** Weight of the original file, in bytes. */
  originalBytes: number;
  /** Weight after optimisation, in bytes. */
  optimizedBytes: number;
  width: number;
  height: number;
  /** Stored format: WebP when the browser can encode it, JPEG otherwise. */
  mime: 'image/webp' | 'image/jpeg';
}

/** Whether this browser's canvas can encode WebP (cached). */
let webpSupport: boolean | null = null;
async function canEncodeWebp(): Promise<boolean> {
  if (webpSupport !== null) return webpSupport;
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const b = await canvasToBlob(c, 'image/webp', 0.8);
  webpSupport = !!b && b.type === 'image/webp';
  return webpSupport;
}

/**
 * Decodes a picture with its camera orientation applied (phone photos are
 * often stored sideways with an EXIF rotation flag).
 */
async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height };
    } catch { /* fall back to <img> */ }
  }
  const img = await loadImage(await fileToDataURL(file));
  return { source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
}

/**
 * Squeezes a picture down as much as possible while keeping it sharp at
 * screen size, aiming at `targetBytes` (default ~60 KB).
 *
 * - WebP (≈30 % lighter than JPEG at the same look) when supported, JPEG else;
 * - the longest edge is capped at 1280 px, then the quality is walked down
 *   until the file fits, and the canvas is shrunk further if still too heavy;
 * - transparent areas are flattened on white, metadata (EXIF, GPS) is dropped.
 * A 5–10 MB camera shot typically lands around 40–70 KB.
 */
export async function optimizeImage(
  file: File,
  targetBytes: number = APARTMENT_PHOTO_TARGET_BYTES,
  maxDim: number = APARTMENT_PHOTO_MAX_DIM,
): Promise<OptimizedImage> {
  const originalBytes = file.size;
  const mime: OptimizedImage['mime'] = (await canEncodeWebp()) ? 'image/webp' : 'image/jpeg';
  const { source, width, height } = await decodeImage(file);

  let scale = Math.min(1, maxDim / Math.max(width, height));
  let best: { blob: Blob; w: number; h: number } | null = null;
  const ladder = mime === 'image/webp'
    ? [0.78, 0.7, 0.62, 0.55, 0.48, 0.42, 0.36]
    : [0.8, 0.72, 0.64, 0.56, 0.48, 0.42, 0.36];

  // Up to 5 canvas sizes; each one sweeps the quality ladder.
  for (let pass = 0; pass < 5; pass++) {
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, w, h);

    for (const quality of ladder) {
      const blob = await canvasToBlob(canvas, mime, quality);
      if (!blob) continue;
      if (!best || blob.size < best.blob.size) best = { blob, w, h };
      if (blob.size <= targetBytes) {
        if ('close' in source) (source as ImageBitmap).close();
        return { blob, originalBytes, optimizedBytes: blob.size, width: w, height: h, mime };
      }
    }
    // Still too heavy → shrink the canvas, but never below ~960 px on the
    // longest edge so the photo stays sharp in the full-screen viewer.
    const nextLongest = Math.max(width, height) * scale * 0.8;
    if (nextLongest < APARTMENT_PHOTO_MIN_DIM) break;
    scale *= 0.8;
  }
  if ('close' in source) (source as ImageBitmap).close();

  // Keep the original only if it is somehow lighter than every attempt.
  if (best && best.blob.size < originalBytes) {
    return { blob: best.blob, originalBytes, optimizedBytes: best.blob.size, width: best.w, height: best.h, mime };
  }
  const fallbackMime = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  return { blob: file, originalBytes, optimizedBytes: file.size, width, height, mime: fallbackMime };
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
  const ext = optimized.mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${safeId}/${Date.now()}-${rand}.${ext}`;

  const { error } = await supabase.storage.from(APARTMENT_BUCKET).upload(path, optimized.blob, {
    contentType: optimized.mime,
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
