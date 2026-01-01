import { router } from 'expo-router';
import { Mail, Lock, LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert as RNAlert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      RNAlert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
      // Don't manually redirect - let _layout.tsx handle navigation based on auth state
      // This ensures proper routing based on isAuthenticated and hasOnboarded
    } catch (error: any) {
      RNAlert.alert('Error', error?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <LinearGradient
              colors={[theme.accent.primary, theme.accent.secondary] as any}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <LogIn size={32} color="#FFF" />
            </LinearGradient>

            <Text style={[styles.title, { color: theme.text.primary }]}>
              {t('auth.welcomeBack')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              {t('auth.signInToContinue')}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>{t('auth.email')}</Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: theme.background.card,
                borderColor: theme.border.light,
              }]}>
                <Mail size={20} color={theme.text.tertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text.primary }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>{t('auth.password')}</Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: theme.background.card,
                borderColor: theme.border.light,
              }]}>
                <Lock size={20} color={theme.text.tertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text.primary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={theme.text.tertiary}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.text.tertiary} />
                  ) : (
                    <Eye size={20} color={theme.text.tertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signInButton, { 
                backgroundColor: theme.accent.primary,
                opacity: isLoading ? 0.7 : 1,
              }]}
              onPress={handleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.signInButtonText}>
                {isLoading ? t('common.loading') : t('auth.signIn')}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border.light }]} />
              <Text style={[styles.dividerText, { color: theme.text.tertiary }]}>
                {t('auth.newToDreamBig')}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border.light }]} />
            </View>

            <TouchableOpacity
              style={[styles.signUpLink, { borderColor: theme.border.medium }]}
              onPress={() => router.push('/sign-up' as any)}
            >
              <Text style={[styles.signUpLinkText, { color: theme.accent.primary }]}>
                {t('auth.createAccount')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.employeeLink}
              onPress={() => router.push('/employee-login' as any)}
            >
              <Text style={[styles.employeeLinkText, { color: theme.text.tertiary }]}>
                {t('auth.employeeLogin')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeButton: {
    padding: 4,
  },
  signInButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
  },
  signUpLink: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpLinkText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  employeeLink: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeLinkText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
