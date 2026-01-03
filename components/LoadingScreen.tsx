import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const { theme, isDark } = useTheme();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Try to load splash icon, fallback to gradient circle if not found
  let logoSource;
  try {
    logoSource = require('@/assets/images/splash-icon.png');
  } catch (e) {
    logoSource = null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]} edges={['top', 'bottom']}>
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
          {/* Animated Logo Container */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: opacityAnim,
                transform: [
                  { scale: scaleAnim },
                  { rotate },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoWrapper,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={[theme.accent.primary, theme.accent.secondary] as any}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* White circular background */}
                <View style={styles.whiteCircle}>
                  {logoSource ? (
                    <Image
                      source={logoSource}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.fallbackLogo}>
                      <Text style={styles.fallbackText}>D</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          {/* App Name */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: opacityAnim,
              },
            ]}
          >
            <LinearGradient
              colors={[theme.accent.primary, theme.accent.secondary] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.titleGradient}
            >
              <Animated.Text
                style={[styles.title, { color: '#FFF' }]}
                numberOfLines={1}
              >
                DreamBiz
              </Animated.Text>
            </LinearGradient>
          </Animated.View>

          {/* Loading Message */}
          <Animated.View
            style={[
              styles.messageContainer,
              {
                opacity: opacityAnim,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.loadingDots,
                {
                  opacity: pulseAnim,
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: theme.accent.primary }]} />
              <View style={[styles.dot, { backgroundColor: theme.accent.primary }]} />
              <View style={[styles.dot, { backgroundColor: theme.accent.primary }]} />
            </Animated.View>
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
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    elevation: 8,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteCircle: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingVertical: 12,
    elevation: 4,
  },
  titleGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
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

