/**
 * Public entry: Become a Supplier / Apply.
 * - Not logged in: show options to sign up (with intent) or go to supplier login.
 * - Logged in: fetch or create single application, then route by status.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, FileText, LogIn, Truck, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getMySupplierApplication, getOrCreateSupplierApplication } from '@/hooks/useSupplierApplication';
import type { SupplierApplicationStatus } from '@/hooks/useSupplierApplication';
import { spacing, contentMaxWidth, radius, typography, minTouchTarget } from '@/constants/layout';

export default function SupplierApplyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let app = await getMySupplierApplication(user.id);
        if (!app && !cancelled) {
          app = await getOrCreateSupplierApplication(user.id);
        }
        if (cancelled) return;
        setError(null);
        routeByStatus(app?.status ?? null);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Something went wrong');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

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
    if (!status) {
      router.replace('/suppliers-marketplace/become-a-supplier' as any);
      return;
    }
    router.replace('/suppliers-marketplace/my-application' as any);
  };

  const contentWidth = Math.min(width - spacing.md * 2, contentMaxWidth);

  if (!user) {
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
                <Truck size={40} color="#FFF" strokeWidth={2} />
              </View>
              <Text style={styles.heroTitle}>Become a Supplier</Text>
              <Text style={styles.heroSubtitle}>
                Apply to sell on the DreamBig marketplace. Approval is required before you can publish products.
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.md }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: theme.background.card, width: contentWidth, alignSelf: 'center', maxWidth: '100%' }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Get started</Text>
            <Text style={[styles.cardDesc, { color: theme.text.secondary }]}>
              Create an account to submit your supplier application, or sign in if you already have one.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
              onPress={() => router.push('/sign-up?intent=supplier' as any)}
              activeOpacity={0.85}
            >
              <FileText size={20} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.primaryBtnText}>Create account & apply</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.border.medium }]}
              onPress={() => router.push('/supplier-login' as any)}
              activeOpacity={0.85}
            >
              <LogIn size={20} color={theme.accent.primary} strokeWidth={2.5} />
              <Text style={[styles.secondaryBtnText, { color: theme.accent.primary }]}>I have an account — Supplier Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading your application...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background.secondary }]}>
        <View style={[styles.errorIconWrap, { backgroundColor: theme.surface.danger }]}>
          <AlertCircle size={32} color={theme.accent.danger} />
        </View>
        <Text style={[styles.errorTitle, { color: theme.text.primary }]}>Something went wrong</Text>
        <Text style={[styles.errorText, { color: theme.text.secondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent.primary, marginTop: spacing.lg }]}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.centered, { backgroundColor: theme.background.secondary }]}>
      <ActivityIndicator size="large" color={theme.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  safeArea: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  hero: { paddingTop: spacing.xs },
  backBtn: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroContent: { alignItems: 'center', paddingBottom: spacing.lg },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
  scroll: { flex: 1 },
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
  cardTitle: {
    ...typography.cardTitle,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.bodySmall,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    minHeight: minTouchTarget,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    minHeight: minTouchTarget,
  },
  secondaryBtnText: { fontWeight: '600', fontSize: 15 },
  loadingText: { marginTop: spacing.md, ...typography.bodySmall },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorTitle: { ...typography.sectionTitle, marginBottom: spacing.xs, textAlign: 'center' },
  errorText: { ...typography.bodySmall, textAlign: 'center', paddingHorizontal: spacing.lg },
});
