import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CART_SPACING, CART_RADIUS, CART_TYPOGRAPHY } from '@/constants/cart-design';

interface OrderSummaryCardProps {
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  showDigitalNote?: boolean;
  theme: {
    background: { card: string };
    text: { primary: string; secondary: string };
    accent: { primary: string; success?: string };
    border: { light: string };
  };
}

export function OrderSummaryCard({
  subtotal,
  discount,
  total,
  currency,
  showDigitalNote,
  theme,
}: OrderSummaryCardProps) {
  const format = (n: number) => `${currency} ${n.toFixed(2)}`;

  return (
    <View style={[styles.card, { backgroundColor: theme.background.card }]}>
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Order summary</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.text.secondary }]}>Subtotal</Text>
        <Text style={[styles.value, { color: theme.text.primary }]}>{format(subtotal)}</Text>
      </View>
      {discount > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text.secondary }]}>Discount</Text>
          <Text style={[styles.valueDiscount, { color: theme.accent.success }]}>-{format(discount)}</Text>
        </View>
      )}
      <View style={[styles.divider, { backgroundColor: theme.border.light }]} />
      <View style={styles.row}>
        <Text style={[styles.totalLabel, { color: theme.text.primary }]}>Total</Text>
        <Text style={[styles.totalValue, { color: theme.accent.primary }]}>{format(total)}</Text>
      </View>
      {showDigitalNote && (
        <Text style={[styles.note, { color: theme.text.secondary }]}>
          Secure checkout • Instant access for digital products
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: CART_RADIUS.lg,
    padding: CART_SPACING.lg,
    marginTop: CART_SPACING.sm,
  },
  sectionTitle: {
    ...CART_TYPOGRAPHY.sectionTitle,
    marginBottom: CART_SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: CART_SPACING.xs,
  },
  label: {
    ...CART_TYPOGRAPHY.meta,
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueDiscount: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: CART_SPACING.sm,
  },
  totalLabel: {
    ...CART_TYPOGRAPHY.totalSmall,
  },
  totalValue: {
    ...CART_TYPOGRAPHY.total,
  },
  note: {
    ...CART_TYPOGRAPHY.meta,
    marginTop: CART_SPACING.sm,
    fontSize: 12,
  },
});
