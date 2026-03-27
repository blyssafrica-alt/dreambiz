import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { supabaseAnonKey, supabaseUrl } from './supabase';

const readBase64FromBlob = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const readBase64FromUri = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return readBase64FromBlob(blob);
  }

  try {
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  } catch (error) {
    // Some Android content URIs need to be copied to cache first.
    if (Platform.OS === 'android' && uri.startsWith('content://')) {
      const tempFileName = `upload-${Date.now()}.bin`;
      const tempUri = `${FileSystem.cacheDirectory ?? ''}${tempFileName}`;
      try {
        await FileSystem.copyAsync({ from: uri, to: tempUri });
        return await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
      } finally {
        if (tempUri) {
          await FileSystem.deleteAsync(tempUri, { idempotent: true });
        }
      }
    }
    throw error;
  }
};

export const getBase64FromAsset = async (asset: ImagePickerAsset): Promise<string> => {
  if (asset.base64) {
    return asset.base64;
  }
  return readBase64FromUri(asset.uri);
};

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const sanitizeExtension = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned || undefined;
};

const resolveContentType = (contentType: string | undefined, filePath: string): string => {
  const normalized = contentType ? contentType.split(';')[0].trim() : '';
  const ext = sanitizeExtension(filePath.split('.').pop());
  const mapped = ext ? EXTENSION_MIME_MAP[ext] : undefined;

  if (!normalized) {
    return mapped || 'application/octet-stream';
  }

  if (mapped && normalized !== mapped && normalized === 'image/jpeg') {
    return mapped;
  }

  return normalized;
};

export const buildAssetFileName = (asset: ImagePickerAsset, prefix: string): string => {
  const nameFromAsset = asset.fileName ? asset.fileName.split('?')[0] : undefined;
  const extFromName = nameFromAsset && nameFromAsset.includes('.')
    ? nameFromAsset.split('.').pop()
    : undefined;
  const extFromMime = asset.mimeType ? MIME_EXTENSION_MAP[asset.mimeType] : undefined;
  const extension = sanitizeExtension(extFromName) || sanitizeExtension(extFromMime) || 'jpg';
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'file';
  return `${safePrefix}-${Date.now()}.${extension}`;
};

type UploadBase64Options = {
  bucket: string;
  filePath: string;
  base64: string;
  contentType: string;
  upsert?: boolean;
  maxAttempts?: number;
};

export const uploadBase64ToStorage = async (
  client: SupabaseClient,
  {
    bucket,
    filePath,
    base64,
    contentType,
    upsert = false,
    maxAttempts = 3,
  }: UploadBase64Options
): Promise<string> => {
  const normalizedBase64 = base64.includes('base64,')
    ? base64.split('base64,')[1]
    : base64;
  const sanitizedBase64 = normalizedBase64.replace(/\s/g, '');
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log('[Upload] Starting upload', {
      bucket,
      filePath,
      contentType,
      bytes: Math.floor((sanitizedBase64.length * 3) / 4),
    });
  }
  const resolvedContentType = resolveContentType(contentType, filePath);
  const buildUploadUrl = (targetBucket: string, targetPath: string) => {
    const encodedPath = targetPath
      .split('/')
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `${supabaseUrl}/storage/v1/object/${targetBucket}/${encodedPath}`;
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (Platform.OS !== 'web') {
        const tempFileName = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`;
        const tempUri = `${FileSystem.cacheDirectory ?? ''}${tempFileName}`;
        try {
          await FileSystem.writeAsStringAsync(tempUri, sanitizedBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const { data: { session } } = await client.auth.getSession();
          const accessToken = session?.access_token;
          const uploadUrl = buildUploadUrl(bucket, filePath);

          const uploadResult = await FileSystem.uploadAsync(uploadUrl, tempUri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
              'Content-Type': resolvedContentType,
              apikey: supabaseAnonKey,
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              'x-upsert': upsert ? 'true' : 'false',
            },
          });

          if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error(`Upload failed with status ${uploadResult.status}: ${uploadResult.body || 'Unknown error'}`);
          }
        } finally {
          if (tempUri) {
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
          }
        }
      } else {
        const uploadBody = new Blob([decode(sanitizedBase64)], { type: resolvedContentType });
        const { error } = await client.storage.from(bucket).upload(filePath, uploadBody, {
          contentType: resolvedContentType,
          upsert,
        });
        if (error) {
          throw error;
        }
      }

      const { data } = client.storage.from(bucket).getPublicUrl(filePath);
      if (!data?.publicUrl) {
        throw new Error('Failed to resolve public URL for uploaded file.');
      }
      if (isDev) {
        console.log('[Upload] Success', { bucket, filePath });
      }
      return data.publicUrl;
    } catch (error) {
      lastError = error;
      if (isDev) {
        console.log('[Upload] Attempt failed', {
          attempt,
          bucket,
          filePath,
          message: (error as Error)?.message || String(error),
        });
      }
    }
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw lastError instanceof Error ? lastError : new Error('Upload failed.');
};

