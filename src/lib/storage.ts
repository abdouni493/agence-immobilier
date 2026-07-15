import { fileToDataURL } from './utils';

type Bucket = 'logos' | 'avatars' | 'client-photos';

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
