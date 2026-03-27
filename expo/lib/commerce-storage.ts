/**
 * Commerce storage: uploads and signed URLs for product-files, course-materials,
 * lesson-videos, lesson-attachments, event-tickets.
 * All these buckets are PRIVATE; signed URLs must be created via Edge Function (service role).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

export type AssetScope = 'digital_download' | 'course_resource' | 'lesson_video' | 'lesson_attachment' | 'event_ticket' | 'marketing';

const BUCKET_BY_SCOPE: Record<AssetScope, string> = {
  digital_download: 'product-files',
  course_resource: 'course-materials',
  lesson_video: 'lesson-videos',
  lesson_attachment: 'lesson-attachments',
  event_ticket: 'event-tickets',
  marketing: 'product_images', // public
};

/** Max sizes in bytes. */
const MAX_SIZE_BY_SCOPE: Record<AssetScope, number> = {
  digital_download: 50 * 1024 * 1024,   // 50 MB
  course_resource: 50 * 1024 * 1024,
  lesson_video: 500 * 1024 * 1024,      // 500 MB
  lesson_attachment: 50 * 1024 * 1024,
  event_ticket: 10 * 1024 * 1024,
  marketing: 10 * 1024 * 1024,
};

const ALLOWED_MIMES: Record<AssetScope, string[]> = {
  digital_download: [
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4',
  ],
  course_resource: [
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip',
    'image/png', 'image/jpeg', 'image/webp',
  ],
  lesson_video: ['video/mp4', 'video/webm', 'video/quicktime'],
  lesson_attachment: [
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip', 'image/png', 'image/jpeg', 'image/webp',
  ],
  event_ticket: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
  marketing: ['image/jpeg', 'image/png', 'image/webp'],
};

export function getBucketForScope(scope: AssetScope): string {
  return BUCKET_BY_SCOPE[scope];
}

export function getMaxSizeForScope(scope: AssetScope): number {
  return MAX_SIZE_BY_SCOPE[scope];
}

export function getAllowedMimesForScope(scope: AssetScope): string[] {
  return ALLOWED_MIMES[scope];
}

export function validateFileForScope(
  scope: AssetScope,
  mimeType: string | undefined,
  sizeBytes: number
): { valid: boolean; error?: string } {
  const maxSize = MAX_SIZE_BY_SCOPE[scope];
  if (sizeBytes > maxSize) {
    return { valid: false, error: `File size must be under ${Math.round(maxSize / 1024 / 1024)} MB` };
  }
  const allowed = ALLOWED_MIMES[scope];
  const mime = (mimeType || '').split(';')[0].trim();
  if (mime && allowed.length && !allowed.includes(mime)) {
    return { valid: false, error: `File type not allowed. Allowed: ${allowed.join(', ')}` };
  }
  return { valid: true };
}

/**
 * Build storage path for an asset. Use this so all paths are consistent.
 */
export function buildAssetPath(
  scope: AssetScope,
  productId: string,
  fileName: string,
  extra?: { lessonId?: string; moduleId?: string; eventId?: string }
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  if (scope === 'lesson_video' || scope === 'lesson_attachment') {
    const lessonId = extra?.lessonId ?? 'misc';
    return `${productId}/lessons/${lessonId}/${timestamp}-${safeName}`;
  }
  if (scope === 'event_ticket') {
    const eventId = extra?.eventId ?? productId;
    return `${eventId}/tickets/${timestamp}-${safeName}`;
  }
  return `${productId}/${scope}/${timestamp}-${safeName}`;
}

export interface UploadCommerceAssetOptions {
  scope: AssetScope;
  productId: string;
  fileName: string;
  base64: string;
  mimeType: string;
  sizeBytes: number;
  lessonId?: string;
  eventId?: string;
}

/**
 * Upload an asset to the correct bucket. Returns the storage path (use for DB file_url).
 * For private buckets we store path; signed URL must be obtained via Edge Function.
 */
export async function uploadCommerceAsset(
  client: SupabaseClient,
  options: UploadCommerceAssetOptions
): Promise<{ path: string; bucket: string }> {
  const { scope, productId, fileName, base64, mimeType, sizeBytes, lessonId, eventId } = options;
  const validation = validateFileForScope(scope, mimeType, sizeBytes);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const bucket = BUCKET_BY_SCOPE[scope];
  const path = buildAssetPath(scope, productId, fileName, { lessonId, eventId });

  const normalizedBase64 = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
  const sanitizedBase64 = normalizedBase64.replace(/\s/g, '');

  if (Platform.OS === 'web') {
    const body = new Blob([decode(sanitizedBase64)], { type: mimeType });
    const { error } = await client.storage.from(bucket).upload(path, body, {
      contentType: mimeType,
      upsert: false,
    });
    if (error) throw error;
  } else {
    const tempUri = `${FileSystem.cacheDirectory ?? ''}commerce-upload-${Date.now()}.bin`;
    try {
      await FileSystem.writeAsStringAsync(tempUri, sanitizedBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { data: { session } } = await client.auth.getSession();
      const token = session?.access_token;
      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
      const result = await FileSystem.uploadAsync(url, tempUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': mimeType,
          apikey: supabaseAnonKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed: ${result.status} ${result.body || ''}`);
      }
    } finally {
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    }
  }

  return { path, bucket };
}

/**
 * Returns a full URL for the asset. For public bucket (marketing/product_images) returns public URL.
 * For private buckets, returns a path that the app can pass to an Edge Function to get a signed URL,
 * or use createSignedUrl if your Supabase client has service role (never expose service role in client).
 */
export function getAssetUrl(bucket: string, path: string, isPublic: boolean): string {
  if (isPublic) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  return `storage://${bucket}/${path}`;
}

/**
 * Create a signed URL for a private asset. Must be called from a context that has verified
 * the user has access (user_access table). Uses client.storage.createSignedUrl - works only
 * if the bucket has a SELECT policy for the user; for fully private buckets use an Edge Function
 * with service role to create the signed URL after checking user_access.
 */
export async function createSignedDownloadUrl(
  client: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Failed to create signed URL');
  return data.signedUrl;
}
