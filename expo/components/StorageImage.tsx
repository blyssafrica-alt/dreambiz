import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Package, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabaseUrl } from '@/lib/supabase';
import { normalizeSupplierAssetUrl, normalizeProductImageUrl, normalizeStorageUrl } from '@/lib/storage-utils';

type StorageImageProps = {
  /** Stored URL (full or path) – normalized so images load like DreamBig Books covers */
  uri: string | null | undefined;
  /** 'supplier' = supplier_assets (logos, covers), 'product' = product_images, or pass bucket name */
  bucket?: 'supplier' | 'product' | string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholderIcon?: 'package' | 'image';
  resizeMode?: 'cover' | 'contain' | 'stretch';
};

function resolveUri(uri: string | null | undefined, bucket: 'supplier' | 'product' | string): string | null {
  if (!uri || typeof uri !== 'string') return null;
  if (bucket === 'supplier') return normalizeSupplierAssetUrl(uri, supabaseUrl);
  if (bucket === 'product') return normalizeProductImageUrl(uri, supabaseUrl);
  return normalizeStorageUrl(uri, supabaseUrl, bucket);
}

export function StorageImage({
  uri,
  bucket = 'supplier',
  style,
  containerStyle,
  placeholderIcon = 'image',
  resizeMode = 'cover',
}: StorageImageProps) {
  const { theme } = useTheme();
  const [error, setError] = useState(false);
  const resolvedUri = resolveUri(uri, bucket);
  const showPlaceholder = !resolvedUri || error;
  const PlaceholderIcon = placeholderIcon === 'package' ? Package : ImageIcon;

  if (showPlaceholder) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.background.secondary }, containerStyle, style]}>
        <PlaceholderIcon size={32} color={theme.text.tertiary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      onError={() => setError(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
