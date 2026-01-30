import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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

  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
};

export const getBase64FromAsset = async (asset: ImagePickerAsset): Promise<string> => {
  if (asset.base64) {
    return asset.base64;
  }
  return readBase64FromUri(asset.uri);
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

