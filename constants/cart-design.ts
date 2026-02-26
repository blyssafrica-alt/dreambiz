/**
 * Cart / Checkout design system
 * Spacing: 4, 8, 12, 16, 20, 24
 * Radius: 12–16 for cards
 */
export const CART_SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export const CART_RADIUS = {
  sm: 12,
  md: 14,
  lg: 16,
} as const;

export const CART_TYPOGRAPHY = {
  title: { fontSize: 22, fontWeight: '700' as const },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const },
  itemTitle: { fontSize: 15, fontWeight: '600' as const },
  meta: { fontSize: 12, fontWeight: '500' as const },
  metaMuted: { fontSize: 12 },
  total: { fontSize: 20, fontWeight: '800' as const },
  totalSmall: { fontSize: 18, fontWeight: '700' as const },
  button: { fontSize: 16, fontWeight: '700' as const },
} as const;

/** Minimum touch target (accessibility) */
export const MIN_TOUCH_TARGET = 44;
