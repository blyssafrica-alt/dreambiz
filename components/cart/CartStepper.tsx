import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShoppingCart, CreditCard, CheckCircle } from 'lucide-react-native';
import { CART_SPACING, CART_TYPOGRAPHY } from '@/constants/cart-design';

export type CartStepId = 'cart' | 'checkout' | 'payment' | 'done';

const STEPS: { id: CartStepId; label: string; Icon: typeof ShoppingCart }[] = [
  { id: 'cart', label: 'Cart', Icon: ShoppingCart },
  { id: 'checkout', label: 'Checkout', Icon: ShoppingCart },
  { id: 'payment', label: 'Payment', Icon: CreditCard },
  { id: 'done', label: 'Done', Icon: CheckCircle },
];

const STEP_ORDER: CartStepId[] = ['cart', 'checkout', 'payment', 'done'];

interface CartStepperProps {
  activeStep: CartStepId;
  theme: {
    text: { primary: string; tertiary: string };
    accent: { primary: string };
    border: { light: string };
  };
}

export function CartStepper({ activeStep, theme }: CartStepperProps) {
  const activeIndex = STEP_ORDER.indexOf(activeStep);

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={`Checkout progress: step ${activeIndex + 1} of 4`}>
      {STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isPast = index < activeIndex;
        const Icon = step.Icon;
        return (
          <React.Fragment key={step.id}>
            <View style={styles.step} accessibilityLabel={step.label + (isActive ? ', current step' : '')}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: isActive ? theme.accent.primary : isPast ? theme.accent.primary : theme.border.light },
                ]}
              >
                <Icon size={14} color={isActive || isPast ? '#FFF' : theme.text.tertiary} />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? theme.text.primary : theme.text.tertiary },
                  isActive && styles.labelBold,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View style={[styles.connector, { backgroundColor: theme.border.light }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: CART_SPACING.sm,
    paddingHorizontal: CART_SPACING.xs,
  },
  step: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  label: {
    ...CART_TYPOGRAPHY.meta,
    fontSize: 11,
  },
  labelBold: {
    fontWeight: '700',
  },
  connector: {
    width: 12,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 2,
  },
});
