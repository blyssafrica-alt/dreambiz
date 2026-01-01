import { router } from 'expo-router';
import { Mail, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert as RNAlert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

export default function VerifyEmailScreen() {
  const { theme, isDark } = useTheme();
  const { authUser } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [email, setEmail] = useState(authUser?.email || '');

  useEffect(() => {
    // Set email from authUser
    if (authUser?.email) {
      setEmail(authUser.email);
    }
    
    // Check if email is already verified
    checkEmailStatus();
    
    // Poll for email verification every 3 seconds
    const interval = setInterval(() => {
      checkEmailStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [authUser]);

  const checkEmailStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        // Auto-redirect to onboarding after a short delay
        setTimeout(() => {
          router.replace('/onboarding' as any);
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking email status:', error);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      RNAlert.alert('Error', 'Email address not found');
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
        RNAlert.alert(
          'Email Sent',
          'A new verification email has been sent. Please check your inbox.'
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={[theme.accent.primary, theme.accent.secondary] as any}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isVerified ? (
              <CheckCircle size={48} color="#FFF" />
            ) : (
              <Mail size={48} color="#FFF" />
            )}
          </LinearGradient>

          <Text style={[styles.title, { color: theme.text.primary }]}>
            {isVerified ? 'Email Verified!' : 'Verify Your Email'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            {isVerified
              ? 'Your email has been verified. Redirecting to onboarding...'
              : 'We sent a verification link to your email address. Please check your inbox and click the link to verify your account.'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <View style={styles.emailContainer}>
            <Mail size={20} color={theme.text.secondary} />
            <Text style={[styles.emailText, { color: theme.text.primary }]}>
              {email || 'No email found'}
            </Text>
          </View>

          {!isVerified && (
            <>
              <View style={[styles.infoBox, { backgroundColor: theme.background.secondary }]}>
                <AlertCircle size={20} color={theme.accent.warning} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoTitle, { color: theme.text.primary }]}>
                    Check Your Inbox
                  </Text>
                  <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                    We've sent a verification email to {email}. Click the link in the email to verify your account.
                  </Text>
                </View>
              </View>

              <View style={styles.instructions}>
                <Text style={[styles.instructionTitle, { color: theme.text.primary }]}>
                  Didn't receive the email?
                </Text>
                <Text style={[styles.instructionText, { color: theme.text.secondary }]}>
                  • Check your spam/junk folder{'\n'}
                  • Make sure you entered the correct email address{'\n'}
                  • Wait a few minutes and try resending
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.resendButton,
                  {
                    backgroundColor: theme.background.secondary,
                    borderColor: theme.border.medium,
                  },
                  isChecking && styles.resendButtonDisabled,
                ]}
                onPress={handleResendEmail}
                disabled={isChecking}
              >
                <Text style={[styles.resendButtonText, { color: theme.accent.primary }]}>
                  {isChecking ? 'Sending...' : 'Resend Verification Email'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {isVerified && (
            <View style={[styles.successBox, { backgroundColor: theme.accent.success + '20' }]}>
              <CheckCircle size={24} color={theme.accent.success} />
              <Text style={[styles.successText, { color: theme.accent.success }]}>
                Your email has been verified successfully!
              </Text>
            </View>
          )}
        </View>

        {isVerified && (
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: theme.accent.primary }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              Continue to Onboarding
            </Text>
            <ArrowRight size={20} color="#FFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/sign-in' as any)}
        >
          <Text style={[styles.backButtonText, { color: theme.text.secondary }]}>
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 20,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  instructions: {
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  resendButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  successText: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});

