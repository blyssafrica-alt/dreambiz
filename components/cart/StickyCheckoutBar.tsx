import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { CART_SPACING, CART_RADIUS, CART_TYPOGRAPHY } from '@/constants/cart-design';

interface StickyCheckoutBarProps {
  total: number;
  currency: string;
  onCheckout: () => void;
  loading: boolean;
  disabled: boolean;
  theme: {
    background: { card: string };
    text: { secondary: string };
    accent: { primary: string };
    border: { light: string };
  };
}

export function StickyCheckoutBar({
  total,
  currency,
  onCheckout,
  loading,
  disabled,
  theme,
}: StickyCheckoutBarProps) {
  return (
    <View style={[styles.bar, { backgroundColor: theme.background.card, borderTopColor: theme.border.light }]}>
      <View style={styles.totalWrap}>
        <Text style={[styles.totalLabel, { color: theme.text.secondary }]}>Total</Text>
        <Text style={[styles.totalAmount, { color: theme.accent.primary }]}>
          {currency} {total.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: theme.accent.primary },
          (disabled || loading) && styles.buttonDisabled,
        ]}
        onPress={onCheckout}
        disabled={disabled || loading}
        activeOpacity={0.85}
        accessibilityLabel="Proceed to checkout"
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Proceed to checkout</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CART_SPACING.lg,
    paddingTop: CART_SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? CART_SPACING.xl + 12 : CART_SPACING.xl,
    borderTopWidth: 1,
    gap: CART_SPACING.md,
  },
  totalWrap: {},
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalAmount: {
    ...CART_TYPOGRAPHY.total,
  },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: CART_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...CART_TYPOGRAPHY.button,
    color: '#FFF',
  },
});
