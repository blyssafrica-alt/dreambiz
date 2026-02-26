/**
 * Supplier Login: sign in then route by supplier application status.
 */
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert as RNAlert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getMySupplierApplication, getOrCreateSupplierApplication } from '@/hooks/useSupplierApplication';
import type { SupplierApplicationStatus } from '@/hooks/useSupplierApplication';
import { spacing, contentMaxWidth, radius, typography, minTouchTarget } from '@/constants/layout';

export default function SupplierLoginScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, signIn } = useAuth();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [postLoginRouting, setPostLoginRouting] = useState(false);

  useEffect(() => {
    if (!user?.id || !postLoginRouting) return;
    let cancelled = false;
    (async () => {
      try {
        let app = await getMySupplierApplication(user.id);
        if (!app && !cancelled) app = await getOrCreateSupplierApplication(user.id);
        if (cancelled) return;
        routeByStatus(app?.status ?? null);
      } catch {
        if (!cancelled) router.replace('/supplier-apply' as any);
      } finally {
        if (!cancelled) setPostLoginRouting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, postLoginRouting]);

  const routeByStatus = (status: SupplierApplicationStatus | null) => {
    if (status === 'draft' || status === 'needs_info') {
      router.replace('/suppliers-marketplace/become-a-supplier' as any);
      return;
    }
    if (status === 'submitted' || status === 'pending') {
      router.replace('/suppliers-marketplace/my-application' as any);
      return;
    }
    if (status === 'declined') {
      router.replace('/suppliers-marketplace/become-a-supplier' as any);
      return;
    }
    if (status === 'approved') {
      router.replace('/supplier' as any);
      return;
    }
    router.replace('/supplier-apply' as any);
  };

  useEffect(() => {
    if (user?.id && !postLoginRouting) setPostLoginRouting(true);
  }, [user?.id]);

  const handleSignIn = async () => {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      RNAlert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(trimmed, password);
      setPostLoginRouting(true);
    } catch (e: any) {
      RNAlert.alert('Sign in failed', e?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const contentWidth = Math.min(width - spacing.md * 2, contentMaxWidth);

  if (user && postLoginRouting) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Taking you to your supplier area...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <LinearGradient
        colors={[theme.accent.primary, theme.accent.secondary] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <LogIn size={36} color="#FFF" strokeWidth={2} />
            </View>
            <Text style={styles.heroTitle}>Supplier Login</Text>
            <Text style={styles.heroSubtitle}>
              Sign in to access your application or supplier dashboard.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: theme.background.card, width: contentWidth, alignSelf: 'center', maxWidth: '100%' }]}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>Email</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}>
              <Mail size={20} color={theme.text.tertiary} />
              <TextInput
                style={[styles.input, { color: theme.text.primary }]}
                placeholder="you@example.com"
                placeholderTextColor={theme.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={[styles.label, { color: theme.text.secondary }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}>
              <Lock size={20} color={theme.text.tertiary} />
              <TextInput
                style={[styles.input, { color: theme.text.primary }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.text.tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.eyeBtn}
              >
                {showPassword ? <EyeOff size={22} color={theme.text.tertiary} /> : <Eye size={22} color={theme.text.tertiary} />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => router.push('/supplier-apply' as any)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.linkText, { color: theme.accent.primary }]}>New? Create account & apply as supplier</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  keyboard: { flex: 1 },
  safeArea: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  hero: { paddingTop: spacing.xs },
  backBtn: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroContent: { alignItems: 'center' },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.pageTitle,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xxs,
    marginTop: spacing.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: minTouchTarget,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: spacing.sm },
  eyeBtn: { padding: spacing.xs },
  primaryBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: minTouchTarget,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  linkBtn: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { fontSize: 15, fontWeight: '600' },
  loadingText: { marginTop: spacing.md, ...typography.bodySmall },
});
