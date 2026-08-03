/**
 * Image URL helpers backed by Supabase Storage's image transformation endpoint.
 *
 * Converts public object URLs like:
 *   /storage/v1/object/public/<bucket>/<path>
 * into transformed URLs:
 *   /storage/v1/render/image/public/<bucket>/<path>?width=...&quality=...
 *
 * Original files in the bucket are never modified — only the URLs the frontend
 * uses to display them.
 */

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

interface TransformOpts {
  width?: number;
  quality?: number;
  /** 'origin' returns the original URL untouched (skip transform). */
  format?: 'origin';
}

/**
 * Build a Supabase render-image URL with optional width/quality.
 * Falls back to the input URL when it isn't a Supabase public-object URL
 * (e.g. external CDN, data URIs, /placeholder.svg).
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  opts: TransformOpts = {}
): string {
  if (!url) return '/placeholder.svg';
  if (opts.format === 'origin') return url;

  // Only transform Supabase public-object URLs
  if (!url.includes(OBJECT_PATH)) return url;

  const transformed = url.replace(OBJECT_PATH, RENDER_PATH);
  const params = new URLSearchParams();
  if (opts.width) params.set('width', String(opts.width));
  params.set('quality', String(opts.quality ?? 75));

  const qs = params.toString();
  return qs ? `${transformed}?${qs}` : transformed;
}

/** Build a responsive srcSet string for an image at multiple widths. */
export function buildImageSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 800, 1200],
  quality = 75
): string | undefined {
  if (!url || !url.includes(OBJECT_PATH)) return undefined;
  return widths
    .map((w) => `${optimizeImageUrl(url, { width: w, quality })} ${w}w`)
    .join(', ');
}

/** Default sizes attribute for the gallery grid (2 / 3 / 4 columns). */
export const GALLERY_SIZES =
  '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

/** Shorthand for gallery thumbnails — small. */
export const thumbnailUrl = (url: string | null | undefined) =>
  optimizeImageUrl(url, { width: 400, quality: 75 });

/** Shorthand for full-size gallery / blog images. */
export const displayUrl = (url: string | null | undefined) =>
  optimizeImageUrl(url, { width: 1200, quality: 75 });

/** Shorthand for blog card previews. */
export const cardImageUrl = (url: string | null | undefined) =>
  optimizeImageUrl(url, { width: 800, quality: 75 });
