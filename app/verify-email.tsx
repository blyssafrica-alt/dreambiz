import { router, useFocusEffect } from 'expo-router';
import { Mail, CheckCircle, AlertCircle, ArrowRight, Sparkles, Clock, RefreshCw } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert as RNAlert,
  Animated,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function VerifyEmailScreen() {
  const { theme, isDark } = useTheme();
  const { authUser } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState(authUser?.email || '');
  const [lastResendTime, setLastResendTime] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Set email from authUser
    if (authUser?.email) {
      setEmail(authUser.email);
    }
    
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Check if email is already verified
    checkEmailStatus();
    
    // Poll for email verification every 3 seconds
    const interval = setInterval(() => {
      checkEmailStatus();
    }, 3000);

    // CRITICAL: Listen for app state changes to refresh session when app comes to foreground
    // This handles the case when user clicks email link and returns to app
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground - refresh session to check email verification
        checkEmailStatus();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [authUser]);

  // CRITICAL: Refresh session when screen comes into focus
  // This handles the case when user clicks email link and navigates back to this screen
  useFocusEffect(
    React.useCallback(() => {
      // Refresh session immediately when screen comes into focus
      checkEmailStatus();
    }, [])
  );

  // Pulse animation for mail icon
  useEffect(() => {
    if (!isVerified) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isVerified]);

  // Rotate animation for refresh icon
  useEffect(() => {
    if (isChecking) {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rotate.start();
      return () => rotate.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isChecking]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const checkEmailStatus = async () => {
    if (isVerified) return; // Don't check if already verified
    
    try {
      setIsChecking(true);
      
      // CRITICAL: Refresh the session first to get the latest email verification status
      // This is needed when user clicks the email link and comes back to the app
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.log('Session refresh error (non-critical):', refreshError.message);
        // Don't return - still try to check session
      }
      
      // Get the refreshed session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        setIsChecking(false);
        return;
      }
      
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        setIsChecking(false);
        // Animate success
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.05,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
        
        // CRITICAL: Let _layout.tsx handle navigation automatically
        // It polls every 1 second and will detect verification quickly
        // Show success message for at least 2 seconds, then auto-redirect as backup
        // This gives _layout.tsx time to detect and handle navigation first
        setTimeout(() => {
          // Backup redirect - _layout.tsx should have already redirected
          // But this ensures user isn't stuck if _layout.tsx hasn't caught up yet
          if (isVerified) {
            router.replace('/onboarding' as any);
          }
        }, 3000); // 3 second delay to show success message
      } else {
        setIsChecking(false);
      }
    } catch (error) {
      console.error('Error checking email status:', error);
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      RNAlert.alert('Error', 'Email address not found');
      return;
    }

    if (resendCooldown > 0) {
      return;
    }

    setIsChecking(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        RNAlert.alert('Error', error.message || 'Failed to resend verification email');
      } else {
        setLastResendTime(Date.now());
        setResendCooldown(60); // 60 second cooldown
        RNAlert.alert(
          'Email Sent',
          'A new verification email has been sent. Please check your inbox.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to resend verification email');
    } finally {
      setIsChecking(false);
    }
  };

  const handleContinue = async () => {
    if (!isVerified) {
      RNAlert.alert('Email Not Verified', 'Please verify your email address first');
      return;
    }

    // Navigate to onboarding
    router.replace('/onboarding' as any);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* Header Section */}
          <View style={styles.header}>
            {isVerified ? (
              <Animated.View
                style={{
                  transform: [{ scale: scaleAnim }],
                }}
              >
                <LinearGradient
                  colors={['#10B981', '#059669', '#047857'] as any}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <CheckCircle size={56} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              </Animated.View>
            ) : (
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim }],
                }}
              >
                <AnimatedLogo 
                  size={120} 
                  showGradient={true}
                  rotationSpeed={4000}
                  pulseEnabled={true}
                />
              </Animated.View>
            )}

            {isVerified && (
              <View style={styles.sparklesContainer}>
                <Sparkles size={24} color={theme.accent.success} style={styles.sparkle1} />
                <Sparkles size={20} color={theme.accent.success} style={styles.sparkle2} />
                <Sparkles size={18} color={theme.accent.success} style={styles.sparkle3} />
              </View>
            )}

            <Text style={[styles.title, { color: theme.text.primary }]}>
              {isVerified ? 'Email Verified!' : 'Verify Your Email'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              {isVerified
                ? 'Your email has been successfully verified. You can now proceed to set up your business.'
                : `We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.`}
            </Text>
          </View>

          {/* Main Card */}
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            {/* Email Display */}
            <View style={[styles.emailContainer, { backgroundColor: theme.background.secondary }]}>
              <View style={[styles.emailIconContainer, { backgroundColor: theme.accent.primary + '15' }]}>
                <Mail size={20} color={theme.accent.primary} />
              </View>
              <View style={styles.emailTextContainer}>
                <Text style={[styles.emailLabel, { color: theme.text.secondary }]}>Email Address</Text>
                <Text style={[styles.emailText, { color: theme.text.primary }]} numberOfLines={1}>
                  {email || 'No email found'}
                </Text>
              </View>
            </View>

            {!isVerified && (
              <>
                {/* Info Box */}
                <View style={[styles.infoBox, { backgroundColor: theme.accent.warning + '10', borderColor: theme.accent.warning + '30' }]}>
                  <View style={[styles.infoIconContainer, { backgroundColor: theme.accent.warning + '20' }]}>
                    <AlertCircle size={24} color={theme.accent.warning} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoTitle, { color: theme.text.primary }]}>
                      Check Your Inbox
                    </Text>
                    <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                      We've sent a verification email to {email}. Click the link in the email to verify your account.
                    </Text>
                  </View>
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                  <View style={styles.instructionHeader}>
                    <Clock size={18} color={theme.text.secondary} />
                    <Text style={[styles.instructionTitle, { color: theme.text.primary }]}>
                      Didn't receive the email?
                    </Text>
                  </View>
                  <View style={styles.instructionList}>
                    <View style={styles.instructionItem}>
                      <View style={[styles.bullet, { backgroundColor: theme.accent.primary }]} />
                      <Text style={[styles.instructionText, { color: theme.text.secondary }]}>
                        Check your spam/junk folder
                      </Text>
                    </View>
                    <View style={styles.instructionItem}>
                      <View style={[styles.bullet, { backgroundColor: theme.accent.primary }]} />
                      <Text style={[styles.instructionText, { color: theme.text.secondary }]}>
                        Make sure you entered the correct email address
                      </Text>
                    </View>
                    <View style={styles.instructionItem}>
                      <View style={[styles.bullet, { backgroundColor: theme.accent.primary }]} />
                      <Text style={[styles.instructionText, { color: theme.text.secondary }]}>
                        Wait a few minutes and try resending
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Check Status Button */}
                <TouchableOpacity
                  style={[
                    styles.checkButton,
                    {
                      backgroundColor: theme.background.secondary,
                      borderColor: theme.accent.primary + '40',
                    },
                    isChecking && styles.checkButtonDisabled,
                  ]}
                  onPress={checkEmailStatus}
                  disabled={isChecking}
                  activeOpacity={0.8}
                >
                  {isChecking ? (
                    <>
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <RefreshCw size={20} color={theme.accent.primary} />
                      </Animated.View>
                      <Text style={[styles.checkButtonText, { color: theme.accent.primary }]}>Checking...</Text>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} color={theme.accent.primary} />
                      <Text style={[styles.checkButtonText, { color: theme.accent.primary }]}>Check Verification Status</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Resend Button */}
                <TouchableOpacity
                  style={[
                    styles.resendButton,
                    {
                      backgroundColor: theme.accent.primary,
                      opacity: resendCooldown > 0 ? 0.6 : 1,
                    },
                    isChecking && styles.resendButtonDisabled,
                  ]}
                  onPress={handleResendEmail}
                  disabled={isChecking || resendCooldown > 0}
                  activeOpacity={0.8}
                >
                  {isChecking ? (
                    <>
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <RefreshCw size={20} color="#FFF" />
                      </Animated.View>
                      <Text style={styles.resendButtonText}>Sending...</Text>
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <Clock size={20} color="#FFF" />
                      <Text style={styles.resendButtonText}>Resend in {resendCooldown}s</Text>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} color="#FFF" />
                      <Text style={styles.resendButtonText}>Resend Verification Email</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {isVerified && (
              <View style={[styles.successBox, { backgroundColor: theme.accent.success + '15', borderColor: theme.accent.success + '30' }]}>
                <View style={[styles.successIconContainer, { backgroundColor: theme.accent.success + '20' }]}>
                  <CheckCircle size={28} color={theme.accent.success} strokeWidth={2.5} />
                </View>
                <View style={styles.successContent}>
                  <Text style={[styles.successTitle, { color: theme.text.primary }]}>
                    Verification Successful!
                  </Text>
                  <Text style={[styles.successText, { color: theme.text.secondary }]}>
                    Your email has been verified. Redirecting to onboarding...
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Continue Button (when verified) */}
          {isVerified && (
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: theme.accent.primary }]}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.accent.primary, theme.accent.secondary] as any}
                style={styles.continueButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.continueButtonText}>Continue to Onboarding</Text>
                <ArrowRight size={22} color="#FFF" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/sign-in' as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: theme.text.secondary }]}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  sparklesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle1: {
    position: 'absolute',
    top: 20,
    right: 60,
  },
  sparkle2: {
    position: 'absolute',
    top: 40,
    left: 50,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 20,
    right: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '800' as const,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    fontWeight: '400' as const,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 16,
  },
  emailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailTextContainer: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  instructions: {
    marginBottom: 24,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  instructionList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    fontWeight: '400' as const,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkButtonDisabled: {
    opacity: 0.7,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  resendButtonDisabled: {
    opacity: 0.7,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  successBox: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
  },
  successIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 6,
  },
  successText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  continueButton: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
