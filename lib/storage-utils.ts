/**
 * Storage URL helpers – same approach as DreamBig Books cover images.
 * Ensures Supabase Storage URLs are valid and displayable (public bucket URLs).
 */

export const SUPPLIER_BUCKET = 'supplier_assets';
export const BOOK_COVERS_BUCKET = 'book_covers';
export const PRODUCT_IMAGES_BUCKET = 'product_images';

/**
 * Build the public URL for a file in a Supabase Storage bucket.
 * Use this when you have bucket + path (e.g. from upload) or when normalizing stored URLs.
 */
export function getStoragePublicUrl(
  baseUrl: string,
  bucket: string,
  pathOrFullUrl: string
): string {
  const base = baseUrl.replace(/\/+$/, '');
  if (pathOrFullUrl.startsWith('http://') || pathOrFullUrl.startsWith('https://')) {
    return pathOrFullUrl;
  }
  const path = pathOrFullUrl.startsWith('/') ? pathOrFullUrl.slice(1) : pathOrFullUrl;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Normalize a stored URL that might be full URL or relative path.
 * Use for supplier_assets (logos, covers, docs) so images/documents load even if stored as path.
 */
export function normalizeSupplierAssetUrl(url: string | null | undefined, baseUrl: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return getStoragePublicUrl(baseUrl, SUPPLIER_BUCKET, trimmed);
}

/**
 * Normalize book cover URL (same idea as supplier).
 */
export function normalizeBookCoverUrl(url: string | null | undefined, baseUrl: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return getStoragePublicUrl(baseUrl, BOOK_COVERS_BUCKET, trimmed);
}

/**
 * Normalize product image URL (supplier marketplace products).
 */
export function normalizeProductImageUrl(url: string | null | undefined, baseUrl: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return getStoragePublicUrl(baseUrl, PRODUCT_IMAGES_BUCKET, trimmed);
}

/**
 * Normalize any storage URL given bucket name.
 */
export function normalizeStorageUrl(
  url: string | null | undefined,
  baseUrl: string,
  bucket: string
): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return getStoragePublicUrl(baseUrl, bucket, trimmed);
}
