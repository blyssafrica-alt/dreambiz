import { router } from 'expo-router';
import { Mail, Lock, User, ArrowRight } from 'lucide-react-native';
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

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const { theme, isDark } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      RNAlert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      RNAlert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      RNAlert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(name, email, password);
      router.replace('/onboarding');
    } catch {
      RNAlert.alert('Error', 'Failed to create account');
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
          <View style={styles.header}>
            <LinearGradient
              colors={[theme.accent.primary, theme.accent.secondary] as any}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <User size={32} color="#FFF" />
            </LinearGradient>

            <Text style={[styles.title, { color: theme.text.primary }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
              Join DreamBig Business OS
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Full Name</Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: theme.background.card,
                borderColor: theme.border.light,
              }]}>
                <User size={20} color={theme.text.tertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor={theme.text.tertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Email</Text>
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
              <Text style={[styles.label, { color: theme.text.secondary }]}>Password</Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: theme.background.card,
                borderColor: theme.border.light,
              }]}>
                <Lock size={20} color={theme.text.tertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text.primary }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.text.tertiary}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>
                Confirm Password
              </Text>
              <View style={[styles.inputContainer, { 
                backgroundColor: theme.background.card,
                borderColor: theme.border.light,
              }]}>
                <Lock size={20} color={theme.text.tertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text.primary }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={theme.text.tertiary}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signUpButton, { 
                backgroundColor: theme.accent.primary,
                opacity: isLoading ? 0.7 : 1,
              }]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              <Text style={styles.signUpButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
              <ArrowRight size={20} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border.light }]} />
              <Text style={[styles.dividerText, { color: theme.text.tertiary }]}>
                Already have an account?
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border.light }]} />
            </View>

            <TouchableOpacity
              style={[styles.signInLink, { borderColor: theme.border.medium }]}
              onPress={() => router.push('/sign-in' as any)}
            >
              <Text style={[styles.signInLinkText, { color: theme.accent.primary }]}>
                Sign In
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
    paddingVertical: 60,
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
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  signUpButtonText: {
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
  signInLink: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLinkText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
