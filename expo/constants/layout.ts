/**
 * Layout and typography scale for consistent UI.
 * 8px grid: use multiples of 8 for spacing where possible.
 */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

/** Max content width for readability on desktop */
export const contentMaxWidth = 480;

/** Border radius scale */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/** Typography - use with theme colors */
export const typography = {
  pageTitle: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 20, fontWeight: '600' as const },
  cardTitle: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18 },
  overline: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.5 },
} as const;

/** Minimum touch target size (accessibility) */
export const minTouchTarget = 44;
