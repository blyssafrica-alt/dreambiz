import * as Linking from 'expo-linking';

/**
 * Build a shareable deep link URL for marketplace content.
 * Works for app (dreambiz://) and web (https://) depending on platform.
 */
export function getProductShareUrl(productId: string): string {
  return Linking.createURL(`suppliers-marketplace/product/${productId}`);
}

export function getSupplierStoreShareUrl(supplierId: string): string {
  return Linking.createURL(`suppliers-marketplace/${supplierId}`);
}
