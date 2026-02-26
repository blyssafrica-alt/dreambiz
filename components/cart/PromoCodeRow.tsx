import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ChevronDown, Tag } from 'lucide-react-native';
import { CART_SPACING, CART_RADIUS, CART_TYPOGRAPHY, MIN_TOUCH_TARGET } from '@/constants/cart-design';

interface PromoCodeRowProps {
  theme: {
    background: { card: string; secondary: string };
    text: { primary: string; secondary: string };
    accent: { primary: string };
    border: { light: string };
  };
}

export function PromoCodeRow({ theme }: PromoCodeRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState('');

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background.card }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
        accessibilityLabel={expanded ? 'Collapse promo code' : 'Add promo code'}
        accessibilityRole="button"
      >
        <Tag size={18} color={theme.accent.primary} />
        <Text style={[styles.label, { color: theme.text.primary }]}>Promo code</Text>
        <ChevronDown
          size={18}
          color={theme.text.tertiary}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.inputWrap, { borderColor: theme.border.light }]}>
          <TextInput
            style={[styles.input, { color: theme.text.primary }]}
            placeholder="Enter code"
            placeholderTextColor={theme.text.tertiary}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Promo code input"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: CART_RADIUS.lg,
    padding: CART_SPACING.md,
    marginTop: CART_SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: CART_SPACING.xs,
  },
  label: {
    flex: 1,
    ...CART_TYPOGRAPHY.itemTitle,
    fontSize: 14,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: CART_RADIUS.sm,
    marginTop: CART_SPACING.xs,
    paddingHorizontal: CART_SPACING.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    paddingVertical: CART_SPACING.xs,
  },
});
