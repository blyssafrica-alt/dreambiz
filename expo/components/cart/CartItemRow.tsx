import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CART_SPACING, CART_RADIUS, CART_TYPOGRAPHY, MIN_TOUCH_TARGET } from '@/constants/cart-design';
import type { PlatformProduct } from '@/types/super-admin';
import type { StoreCartItem } from '@/contexts/ProductContext';

interface CartItemRowProps {
  item: StoreCartItem;
  product: PlatformProduct;
  unitPrice: number;
  lineTotal: number;
  maxQty: number;
  isOutOfStock: boolean;
  priceUpdated?: boolean;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  theme: {
    background: { card: string; secondary: string };
    text: { primary: string; secondary: string; tertiary: string };
    accent: { primary: string; danger?: string; warning?: string };
    border: { light: string };
  };
}

function triggerHaptic() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
  }
}

export function CartItemRow({
  item,
  product,
  unitPrice,
  lineTotal,
  maxQty,
  isOutOfStock,
  priceUpdated,
  onQuantityChange,
  onRemove,
  theme,
}: CartItemRowProps) {
  const isDigital = product.type === 'digital' || product.deliveryType === 'download';
  const currency = product.currency || 'USD';

  const handleMinus = () => {
    triggerHaptic();
    if (item.quantity <= 1) {
      onRemove(product.id);
    } else {
      onQuantityChange(product.id, item.quantity - 1);
    }
  };

  const handlePlus = () => {
    if (item.quantity >= maxQty) return;
    triggerHaptic();
    onQuantityChange(product.id, item.quantity + 1);
  };

  const handleRemove = () => {
    triggerHaptic();
    onRemove(product.id);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.background.card }]}>
      <View style={[styles.thumbWrap, { backgroundColor: theme.background.secondary }]}>
        {product.images?.[0] ? (
          <Image source={{ uri: product.images[0] }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.text.primary }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.unitPrice, { color: theme.text.tertiary }]}>
          {currency} {unitPrice.toFixed(2)} each
        </Text>
        {isDigital && (
          <View style={[styles.tag, { backgroundColor: theme.accent.primary + '18' }]}>
            <Text style={[styles.tagText, { color: theme.accent.primary }]}>Digital • Instant access</Text>
          </View>
        )}
        {product.featured && (
          <View style={[styles.tag, { backgroundColor: theme.background.secondary }]}>
            <Text style={[styles.tagText, { color: theme.text.secondary }]}>Best seller</Text>
          </View>
        )}
        {isOutOfStock && (
          <View style={[styles.tag, { backgroundColor: theme.accent.danger + '20' }]}>
            <Text style={[styles.tagText, { color: theme.accent.danger }]}>Out of stock</Text>
          </View>
        )}
        {priceUpdated && (
          <Text style={[styles.priceUpdated, { color: theme.accent.warning }]}>Price updated</Text>
        )}

        <View style={styles.row}>
          <View style={[styles.qtyWrap, { backgroundColor: theme.background.secondary }]}>
            <TouchableOpacity
              onPress={handleMinus}
              style={styles.qtyBtn}
              hitSlop={8}
              accessibilityLabel="Decrease quantity"
              accessibilityRole="button"
              disabled={isOutOfStock}
            >
              <Minus size={18} color={item.quantity <= 1 ? theme.text.tertiary : theme.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: theme.text.primary }]}>{item.quantity}</Text>
            <TouchableOpacity
              onPress={handlePlus}
              style={styles.qtyBtn}
              hitSlop={8}
              accessibilityLabel="Increase quantity"
              accessibilityRole="button"
              disabled={item.quantity >= maxQty || isOutOfStock}
            >
              <Plus size={18} color={item.quantity >= maxQty ? theme.text.tertiary : theme.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.lineTotal, { color: theme.accent.primary }]}>
          {currency} {lineTotal.toFixed(2)}
        </Text>
        <TouchableOpacity
          onPress={handleRemove}
          style={styles.removeBtn}
          hitSlop={12}
          accessibilityLabel={`Remove ${product.name} from cart`}
          accessibilityRole="button"
        >
          <Trash2 size={20} color={theme.text.tertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: CART_RADIUS.lg,
    padding: CART_SPACING.md,
    marginBottom: CART_SPACING.sm,
    minHeight: 120,
    alignItems: 'flex-start',
  },
  thumbWrap: {
    borderRadius: CART_RADIUS.sm,
    overflow: 'hidden',
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: CART_RADIUS.sm,
  },
  thumbPlaceholder: {},
  body: {
    flex: 1,
    marginLeft: CART_SPACING.md,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  name: {
    ...CART_TYPOGRAPHY.itemTitle,
    marginBottom: 4,
  },
  unitPrice: {
    ...CART_TYPOGRAPHY.meta,
    marginBottom: 6,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceUpdated: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CART_RADIUS.sm,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    ...CART_TYPOGRAPHY.itemTitle,
    minWidth: 28,
    textAlign: 'center',
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: CART_SPACING.sm,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  lineTotal: {
    ...CART_TYPOGRAPHY.totalSmall,
  },
  removeBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
