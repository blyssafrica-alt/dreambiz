import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

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

const sanitizeExtension = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned || undefined;
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
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { error } = await client.storage.from(bucket).upload(filePath, decode(base64), {
      contentType,
      upsert,
    });

    if (!error) {
      const { data } = client.storage.from(bucket).getPublicUrl(filePath);
      if (!data?.publicUrl) {
        throw new Error('Failed to resolve public URL for uploaded file.');
      }
      return data.publicUrl;
    }

    lastError = error;
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw lastError instanceof Error ? lastError : new Error('Upload failed.');
};

