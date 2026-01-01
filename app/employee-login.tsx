/**
 * Employee Login Screen
 * Allows employees to log in with email/password or PIN code
 */

import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Lock, Smartphone, Mail, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

export default function EmployeeLoginScreen() {
  const { theme } = useTheme();
  const [loginMethod, setLoginMethod] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      RNAlert.alert('Missing Fields', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      // Verify the user is an active employee
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, is_active, can_login')
        .eq('auth_user_id', data.user.id)
        .single();

      if (employeeError || !employee) {
        await supabase.auth.signOut();
        RNAlert.alert('Access Denied', 'This account is not registered as an employee');
        return;
      }

      if (!employee.is_active) {
        await supabase.auth.signOut();
        RNAlert.alert('Account Inactive', 'Your employee account has been deactivated. Please contact your manager.');
        return;
      }

      if (!employee.can_login) {
        await supabase.auth.signOut();
        RNAlert.alert('Login Disabled', 'Login access has been disabled for your account. Please contact your manager.');
        return;
      }

      // Success - redirect to app
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      RNAlert.alert('Login Failed', error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (!pinCode || pinCode.length < 4) {
      RNAlert.alert('Invalid PIN', 'Please enter a valid PIN code');
      return;
    }

    setLoading(true);
    try {
      // Find employee by PIN code
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, auth_user_id, is_active, can_login, email')
        .eq('pin_code', pinCode)
        .eq('is_active', true)
        .eq('can_login', true)
        .single();

      if (employeeError || !employee) {
        RNAlert.alert('Invalid PIN', 'The PIN code you entered is incorrect');
        return;
      }

      if (!employee.auth_user_id) {
        RNAlert.alert('Account Not Set Up', 'This employee account is not linked to a user account. Please contact your manager.');
        return;
      }

      // For PIN login, we need to sign in as the linked user
      // Note: This requires the employee to have a user account
      // In a production system, you might want to use a different auth method for PIN
      RNAlert.alert(
        'PIN Login',
        'PIN login requires email/password setup. Please use email login or contact your manager.',
        [
          { text: 'OK', onPress: () => setLoginMethod('email') }
        ]
      );
    } catch (error: any) {
      console.error('PIN login error:', error);
      RNAlert.alert('Login Failed', error.message || 'Failed to login with PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <LinearGradient
            colors={theme.gradient.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <User size={48} color="#FFF" />
              <Text style={styles.title}>Employee Login</Text>
              <Text style={styles.subtitle}>Sign in to access your workspace</Text>
            </View>
          </LinearGradient>

          <View style={[styles.content, { backgroundColor: theme.background.secondary }]}>
            {/* Login Method Toggle */}
            <View style={styles.methodToggle}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  loginMethod === 'email' && { backgroundColor: theme.accent.primary },
                  { borderColor: theme.border.light }
                ]}
                onPress={() => setLoginMethod('email')}
              >
                <Mail size={20} color={loginMethod === 'email' ? '#FFF' : theme.text.secondary} />
                <Text style={[
                  styles.methodButtonText,
                  { color: loginMethod === 'email' ? '#FFF' : theme.text.secondary }
                ]}>
                  Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodButton,
                  loginMethod === 'pin' && { backgroundColor: theme.accent.primary },
                  { borderColor: theme.border.light }
                ]}
                onPress={() => setLoginMethod('pin')}
              >
                <Smartphone size={20} color={loginMethod === 'pin' ? '#FFF' : theme.text.secondary} />
                <Text style={[
                  styles.methodButtonText,
                  { color: loginMethod === 'pin' ? '#FFF' : theme.text.secondary }
                ]}>
                  PIN
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email Login Form */}
            {loginMethod === 'email' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Email</Text>
                  <View style={[styles.inputContainer, { borderColor: theme.border.light }]}>
                    <Mail size={20} color={theme.text.tertiary} />
                    <TextInput
                      style={[styles.input, { color: theme.text.primary }]}
                      placeholder="employee@example.com"
                      placeholderTextColor={theme.text.tertiary}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Password</Text>
                  <View style={[styles.inputContainer, { borderColor: theme.border.light }]}>
                    <Lock size={20} color={theme.text.tertiary} />
                    <TextInput
                      style={[styles.input, { color: theme.text.primary }]}
                      placeholder="Enter your password"
                      placeholderTextColor={theme.text.tertiary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
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
                  style={[styles.loginButton, { backgroundColor: theme.accent.primary }]}
                  onPress={handleEmailLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* PIN Login Form */}
            {loginMethod === 'pin' && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>PIN Code</Text>
                  <View style={[styles.inputContainer, { borderColor: theme.border.light }]}>
                    <Smartphone size={20} color={theme.text.tertiary} />
                    <TextInput
                      style={[styles.input, { color: theme.text.primary }]}
                      placeholder="Enter your PIN"
                      placeholderTextColor={theme.text.tertiary}
                      value={pinCode}
                      onChangeText={setPinCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry={!showPin}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPin(!showPin)}
                      style={styles.eyeButton}
                    >
                      {showPin ? (
                        <EyeOff size={20} color={theme.text.tertiary} />
                      ) : (
                        <Eye size={20} color={theme.text.tertiary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, { backgroundColor: theme.accent.primary }]}
                  onPress={handlePinLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In with PIN</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={[styles.backButtonText, { color: theme.text.secondary }]}>
                Back to Main Login
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  methodToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeButton: {
    padding: 4,
  },
  loginButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

