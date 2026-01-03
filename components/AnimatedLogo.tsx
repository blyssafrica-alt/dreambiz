import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface AnimatedLogoProps {
  size?: number;
  showGradient?: boolean;
  rotationSpeed?: number;
  pulseEnabled?: boolean;
  style?: ViewStyle;
}

export default function AnimatedLogo({
  size = 80,
  showGradient = true,
  rotationSpeed = 4000,
  pulseEnabled = true,
  style,
}: AnimatedLogoProps) {
  const { theme } = useTheme();
  
  // Multiple animation values for complex effects
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateReverseAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    // Entrance animation - dramatic entrance
    if (isMounted) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 30,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous rotation animation (main circle)
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: rotationSpeed,
          useNativeDriver: true,
        })
      ).start();

      // Reverse rotation for inner elements (creates dynamic effect)
      Animated.loop(
        Animated.timing(rotateReverseAnim, {
          toValue: 1,
          duration: rotationSpeed * 1.5,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation - more dynamic
      if (pulseEnabled) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.08,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }

      // Shimmer/shine effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow pulse effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Floating effect (subtle up/down movement)
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      isMounted = false;
    };
  }, [rotationSpeed, pulseEnabled, scaleAnim, opacityAnim, rotateAnim, rotateReverseAnim, pulseAnim, shimmerAnim, glowAnim, floatAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotateReverse = rotateReverseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-size * 2, size * 2],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 0],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // Try to load splash icon
  let logoSource;
  try {
    logoSource = require('@/assets/images/splash-icon.png');
  } catch (e) {
    // Logo not found - will use gradient circle
    logoSource = null;
  }

  const containerSize = size;
  const logoSize = size * 0.85; // Logo takes 85% of container (image already has white background)
  const innerGlowSize = logoSize * 0.95; // Inner glow is 95% of logo size

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          opacity: opacityAnim,
          transform: [
            { translateY: floatY },
            { scale: scaleAnim },
          ],
        },
        style,
      ]}
    >
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: containerSize * 1.2,
            height: containerSize * 1.2,
            borderRadius: (containerSize * 1.2) / 2,
            opacity: glowOpacity,
          },
        ]}
      >
        <LinearGradient
          colors={[theme.accent.primary + '40', theme.accent.secondary + '20', 'transparent'] as any}
          style={styles.glowGradient}
        />
      </Animated.View>

      {/* Main rotating container */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            width: containerSize,
            height: containerSize,
            transform: [
              { rotate },
              { scale: pulseEnabled ? pulseAnim : 1 },
            ],
          },
        ]}
      >
        {showGradient ? (
          <LinearGradient
            colors={[theme.accent.primary, theme.accent.secondary, theme.accent.primary] as any}
            style={[styles.logoGradient, { borderRadius: containerSize / 2 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Shimmer effect overlay */}
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  opacity: shimmerOpacity,
                  transform: [{ translateX: shimmerTranslateX }],
                },
              ]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>

            {/* Logo image directly - no extra white circle since image already has white background */}
            <Animated.View
              style={[
                styles.logoImageContainer,
                {
                  transform: [{ rotate: rotateReverse }],
                },
              ]}
            >
              {logoSource ? (
                <Image
                  source={logoSource}
                  style={[
                    styles.logoImage, 
                    { 
                      width: logoSize, 
                      height: logoSize,
                      borderRadius: logoSize / 2, // Make it circular
                    }
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.fallbackLogo, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
                  <LinearGradient
                    colors={[theme.accent.primary, theme.accent.secondary] as any}
                    style={styles.fallbackGradient}
                  >
                    <Animated.Text 
                      style={[
                        styles.fallbackText, 
                        { 
                          fontSize: logoSize * 0.45,
                          color: '#FFF',
                          transform: [{ rotate: rotate }],
                        }
                      ]}
                    >
                      B
                    </Animated.Text>
                  </LinearGradient>
                </View>
              )}
            </Animated.View>

            {/* Inner glow ring */}
            <Animated.View
              style={[
                styles.innerGlow,
                {
                  width: innerGlowSize,
                  height: innerGlowSize,
                  borderRadius: innerGlowSize / 2,
                  opacity: glowOpacity,
                },
              ]}
              pointerEvents="none"
            />
          </LinearGradient>
        ) : (
          <View style={[styles.logoWrapperNoGradient, { borderRadius: containerSize / 2 }]}>
            {/* Logo image directly - no extra white circle since image already has white background */}
            {logoSource ? (
              <Image
                source={logoSource}
                style={[
                  styles.logoImage, 
                  { 
                    width: logoSize, 
                    height: logoSize,
                    borderRadius: logoSize / 2, // Make it circular
                  }
                ]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.fallbackLogo, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
                <Animated.Text style={[styles.fallbackText, { fontSize: logoSize * 0.4, color: theme.accent.primary }]}>
                  D
                </Animated.Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>

      {/* Decorative particles/rings */}
      <Animated.View
        style={[
          styles.decorativeRing1,
          {
            width: containerSize * 1.15,
            height: containerSize * 1.15,
            borderRadius: (containerSize * 1.15) / 2,
            transform: [{ rotate: rotateReverse }],
            opacity: opacityAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.2],
            }),
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.decorativeRing2,
          {
            width: containerSize * 1.08,
            height: containerSize * 1.08,
            borderRadius: (containerSize * 1.08) / 2,
            transform: [{ rotate }],
            opacity: opacityAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15],
            }),
          },
        ]}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 3,
  },
  shimmerGradient: {
    width: '60%',
    height: '100%',
    borderRadius: 999,
  },
  logoImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    overflow: 'hidden', // Clip image to circular shape
  },
  innerGlow: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    zIndex: 2,
  },
  logoWrapperNoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    overflow: 'hidden', // Ensure image is clipped to circular shape
  },
  fallbackLogo: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fallbackGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  fallbackText: {
    fontWeight: '900',
    letterSpacing: -1,
  },
  decorativeRing1: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.3)',
    zIndex: 1,
  },
  decorativeRing2: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    zIndex: 1,
  },
});

