import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, StatusBar, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const { theme, isDark } = useTheme();
  
  // Enhanced animation values for captivating effects
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const titleScaleAnim = useRef(new Animated.Value(0.9)).current;
  const titleOpacityAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    // Dramatic entrance animation with staggered timing
    if (isMounted) {
      Animated.sequence([
        // Logo entrance
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 25,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        // Title entrance (after logo)
        Animated.parallel([
          Animated.spring(titleScaleAnim, {
            toValue: 1,
            tension: 30,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(titleOpacityAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Continuous rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation - more dynamic
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
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

      // Floating animation
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

      // Shimmer effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Loading dots animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotsAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(dotsAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      isMounted = false;
    };
  }, [scaleAnim, opacityAnim, titleScaleAnim, titleOpacityAnim, rotateAnim, pulseAnim, floatAnim, shimmerAnim, glowAnim, dotsAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-240, 240],
  });

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.9, 0],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  // Animated dot opacities
  const dot1Opacity = dotsAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 1, 0.3, 0.3],
  });

  const dot2Opacity = dotsAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 0.3, 1, 0.3],
  });

  const dot3Opacity = dotsAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.3, 0.3, 0.3, 1],
  });

  // Try to load splash icon, fallback to gradient circle if not found
  let logoSource;
  try {
    logoSource = require('@/assets/images/splash-icon.png');
  } catch (e) {
    logoSource = null;
  }

  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.background.primary,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }
      ]} 
      edges={['top', 'bottom']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark 
          ? [theme.background.primary, theme.background.secondary] 
          : [theme.accent.primary + '10', theme.background.primary]
        }
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Enhanced Animated Logo Container */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: opacityAnim,
                transform: [
                  { translateY: floatY },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Outer glow effect */}
            <Animated.View
              style={[
                styles.outerGlow,
                {
                  opacity: glowOpacity,
                },
              ]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={[theme.accent.primary + '50', theme.accent.secondary + '30', 'transparent'] as any}
                style={styles.outerGlowGradient}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.logoWrapper,
                {
                  transform: [
                    { rotate },
                    { scale: pulseAnim },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[theme.accent.primary, theme.accent.secondary, theme.accent.primary] as any}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Shimmer effect */}
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
                    colors={['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                  />
                </Animated.View>

                {/* Logo image directly - no extra white circle since image already has white background */}
                <View style={styles.logoImageContainer}>
                  {logoSource ? (
                    <Image
                      source={logoSource}
                      style={[
                        styles.logoImage,
                        {
                          borderRadius: 60, // Circular (half of 120px logoWrapper size)
                        }
                      ]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.fallbackLogo}>
                      <LinearGradient
                        colors={[theme.accent.primary, theme.accent.secondary] as any}
                        style={styles.fallbackGradient}
                      >
                        <Text style={styles.fallbackText}>B</Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>

                {/* Inner glow ring */}
                <Animated.View
                  style={[
                    styles.innerGlow,
                    {
                      opacity: glowOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.6],
                      }),
                    },
                  ]}
                  pointerEvents="none"
                />
              </LinearGradient>
            </Animated.View>

            {/* Decorative rings */}
            <Animated.View
              style={[
                styles.decorativeRing,
                {
                  transform: [{ rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '-360deg'],
                  })}],
                  opacity: opacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.25],
                  }),
                },
              ]}
              pointerEvents="none"
            />
          </Animated.View>

          {/* App Name with enhanced animation - Unique Design */}
          <Animated.View
            style={[
              styles.titleWrapper,
              {
                opacity: titleOpacityAnim,
                transform: [{ scale: titleScaleAnim }],
              },
            ]}
          >
            {/* Decorative elements behind text */}
            <View style={styles.titleDecorations}>
              <Animated.View
                style={[
                  styles.titleGlow,
                  {
                    opacity: glowOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.6],
                    }),
                    backgroundColor: theme.accent.primary + '20',
                  },
                ]}
              />
            </View>
            
            {/* Main title with gradient text effect */}
            <View style={[styles.titleContainer, { shadowColor: theme.accent.primary }]}>
              <LinearGradient
                colors={[theme.accent.primary, theme.accent.secondary, theme.accent.primary] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.titleGradient}
              >
                <Animated.Text
                  style={[styles.title, { 
                    color: '#FFF',
                    textShadowColor: 'rgba(0, 0, 0, 0.3)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 8,
                  }]}
                  numberOfLines={1}
                >
                  DreamBiz
                </Animated.Text>
              </LinearGradient>
            </View>
            
            {/* Subtitle accent */}
            <Animated.Text
              style={[
                styles.subtitle,
                {
                  color: theme.text.tertiary,
                  opacity: titleOpacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.7],
                  }),
                },
              ]}
            >
              Business Operating System
            </Animated.Text>
          </Animated.View>

          {/* Enhanced Loading Message with animated dots */}
          <Animated.View
            style={[
              styles.messageContainer,
              {
                opacity: titleOpacityAnim,
              },
            ]}
          >
            <View style={styles.loadingDots}>
              <Animated.View 
                style={[
                  styles.dot, 
                  { 
                    backgroundColor: theme.accent.primary,
                    opacity: dot1Opacity,
                    transform: [{ scale: dot1Opacity.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.2],
                    })}],
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.dot, 
                  { 
                    backgroundColor: theme.accent.secondary,
                    opacity: dot2Opacity,
                    transform: [{ scale: dot2Opacity.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.2],
                    })}],
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.dot, 
                  { 
                    backgroundColor: theme.accent.primary,
                    opacity: dot3Opacity,
                    transform: [{ scale: dot3Opacity.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.2],
                    })}],
                  }
                ]} 
              />
            </View>
            {message && (
              <Animated.Text
                style={[styles.message, { color: theme.text.secondary }]}
              >
                {message}
              </Animated.Text>
            )}
          </Animated.View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    zIndex: 0,
  },
  outerGlowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    position: 'relative',
    zIndex: 2,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 3,
    pointerEvents: 'none',
  },
  shimmerGradient: {
    width: '50%',
    height: '100%',
    borderRadius: 999,
  },
  logoImageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    overflow: 'hidden', // Clip image to circular shape
    width: 120,
    height: 120,
    borderRadius: 60, // Circular container
  },
  innerGlow: {
    position: 'absolute',
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  decorativeRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 102, 204, 0.3)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    overflow: 'hidden', // Ensure image is clipped to circular shape
  },
  titleWrapper: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  titleDecorations: {
    position: 'absolute',
    width: '120%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  titleGlow: {
    width: 280,
    height: 80,
    borderRadius: 40,
    position: 'absolute',
  },
  titleContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 32,
    paddingVertical: 16,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 1,
  },
  titleGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
      default: 'sans-serif',
    }),
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 12,
    textAlign: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  fallbackLogo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFF',
  },
});

