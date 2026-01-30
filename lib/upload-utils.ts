import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { ImagePickerAsset } from 'expo-image-picker';

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

