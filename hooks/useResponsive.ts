import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints for responsive design
 */
const BREAKPOINTS = {
  small: 375,   // iPhone SE, small Android phones
  medium: 414,  // iPhone 11 Pro Max, standard Android phones
  large: 768,   // Tablets
};

/**
 * Custom hook for responsive design based on screen width
 * Returns scaling functions and breakpoint information
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  // Determine current breakpoint
  const isSmallScreen = width < BREAKPOINTS.small;
  const isMediumScreen = width >= BREAKPOINTS.small && width < BREAKPOINTS.medium;
  const isLargeScreen = width >= BREAKPOINTS.medium && width < BREAKPOINTS.large;
  const isTablet = width >= BREAKPOINTS.large;
  
  /**
   * Scale a value based on screen width
   * @param baseValue - Base value for medium screens (375-414px)
   * @param smallMultiplier - Multiplier for small screens (<375px), default 0.85
   * @param largeMultiplier - Multiplier for large screens (>=414px), default 1.1
   * @returns Scaled value
   */
  const scale = (
    baseValue: number,
    smallMultiplier: number = 0.85,
    largeMultiplier: number = 1.1
  ): number => {
    if (isSmallScreen) {
      return Math.round(baseValue * smallMultiplier);
    }
    if (isTablet) {
      return Math.round(baseValue * largeMultiplier * 1.3);
    }
    if (isLargeScreen) {
      return Math.round(baseValue * largeMultiplier);
    }
    return baseValue;
  };
  
  /**
   * Scale font size responsively
   */
  const scaleFont = (
    baseSize: number,
    smallMultiplier: number = 0.9,
    largeMultiplier: number = 1.05
  ): number => {
    return scale(baseSize, smallMultiplier, largeMultiplier);
  };
  
  /**
   * Scale spacing/padding responsively
   */
  const scaleSpacing = (
    baseSize: number,
    smallMultiplier: number = 0.85,
    largeMultiplier: number = 1.1
  ): number => {
    return scale(baseSize, smallMultiplier, largeMultiplier);
  };
  
  /**
   * Get responsive padding values
   */
  const padding = {
    xs: scaleSpacing(4),
    sm: scaleSpacing(8),
    md: scaleSpacing(12),
    lg: scaleSpacing(16),
    xl: scaleSpacing(20),
    xxl: scaleSpacing(24),
  };
  
  /**
   * Get responsive font sizes
   */
  const fontSize = {
    xs: scaleFont(10),
    sm: scaleFont(12),
    md: scaleFont(14),
    lg: scaleFont(16),
    xl: scaleFont(18),
    xxl: scaleFont(20),
    xxxl: scaleFont(24),
    huge: scaleFont(32),
  };
  
  return {
    width,
    height,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isTablet,
    scale,
    scaleFont,
    scaleSpacing,
    padding,
    fontSize,
  };
}
