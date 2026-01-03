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
  rotationSpeed = 3000,
  pulseEnabled = true,
  style,
}: AnimatedLogoProps) {
  const { theme } = useTheme();
  
  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: rotationSpeed,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation (if enabled)
    if (pulseEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [rotationSpeed, pulseEnabled]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
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
  const logoSize = size * 0.7; // Logo takes 70% of container

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          transform: [
            { scale: scaleAnim },
            { rotate },
          ],
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            width: containerSize,
            height: containerSize,
            transform: [{ scale: pulseEnabled ? pulseAnim : 1 }],
          },
        ]}
      >
        {showGradient ? (
          <LinearGradient
            colors={[theme.accent.primary, theme.accent.secondary] as any}
            style={[styles.logoGradient, { borderRadius: containerSize / 2 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {logoSource ? (
              <Image
                source={logoSource}
                style={[styles.logoImage, { width: logoSize, height: logoSize }]}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.fallbackLogo, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
                <LinearGradient
                  colors={['#FFF', '#F0F0F0'] as any}
                  style={styles.fallbackGradient}
                >
                  {/* Fallback: First letter of app name */}
                  <Animated.Text style={[styles.fallbackText, { fontSize: logoSize * 0.4 }]}>
                    D
                  </Animated.Text>
                </LinearGradient>
              </View>
            )}
          </LinearGradient>
        ) : (
          <View style={[styles.logoWrapperNoGradient, { borderRadius: containerSize / 2 }]}>
            {logoSource ? (
              <Image
                source={logoSource}
                style={[styles.logoImage, { width: logoSize, height: logoSize }]}
                resizeMode="contain"
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
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
  },
  fallbackLogo: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  fallbackGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  fallbackText: {
    fontWeight: '800',
    color: '#0066CC',
  },
});

