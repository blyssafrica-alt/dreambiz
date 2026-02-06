/**
 * URL utilities for fixing corrupted Supabase storage URLs
 * Specifically fixes bucket names with spaces (e.g., "ad payment proofs" -> "ad_payment_proofs")
 */

/**
 * Normalizes a Supabase storage URL by fixing bucket names with spaces
 * @param url - The URL to normalize
 * @returns The normalized URL with underscores instead of spaces in bucket names
 */
export const normalizeStorageUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // If it's not a Supabase storage URL, return as-is
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/^\/storage\/v1\/object\/public\/([^\/]+)(\/.*)?$/);
    
    if (pathMatch) {
      // Extract bucket name (may be URL-encoded or have spaces)
      const bucketNameInUrl = decodeURIComponent(pathMatch[1]);
      
      // Normalize the bucket name: replace spaces with underscores
      const normalizedBucket = bucketNameInUrl.replace(/\s+/g, '_');
      
      // Only fix if bucket name has spaces (to avoid unnecessary changes)
      if (bucketNameInUrl !== normalizedBucket) {
        // Reconstruct path with normalized bucket name
        const restOfPath = pathMatch[2] || '';
        urlObj.pathname = `/storage/v1/object/public/${encodeURIComponent(normalizedBucket)}${restOfPath}`;
        return urlObj.toString();
      }
    }
  } catch (urlError) {
    // If URL parsing fails, try simple string replacement as fallback
    return url.replace(
      /(\/storage\/v1\/object\/public\/)([^\/\?]+)(\/)/,
      (match, prefix, bucketName, suffix) => {
        try {
          const decoded = decodeURIComponent(bucketName);
          const normalized = decoded.replace(/\s+/g, '_');
          if (decoded !== normalized) {
            return prefix + encodeURIComponent(normalized) + suffix;
          }
        } catch (e) {
          // If decoding fails, just replace spaces directly
          const normalized = bucketName.replace(/\s+/g, '_');
          if (bucketName !== normalized) {
            return prefix + normalized + suffix;
          }
        }
        return match;
      }
    );
  }

  return url;
};

/**
 * Checks if a URL is a local file URI (file://) that shouldn't be used for Image components
 */
export const isLocalFileUri = (url: string | null | undefined): boolean => {
  return !!(url && typeof url === 'string' && url.startsWith('file://'));
};

/**
 * Gets a safe URL for Image components (never file://, always normalized)
 */
export const getSafeImageUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Never allow file:// URIs
  if (isLocalFileUri(url)) {
    return null;
  }

  // Normalize Supabase storage URLs
  return normalizeStorageUrl(url);
};

