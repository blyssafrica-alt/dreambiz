import { useRouter } from 'expo-router';
import { Store, Package, CreditCard, BarChart3, Megaphone, Layers, ArrowLeft, ChevronRight, MessageSquare, AlertCircle, Radio, ShoppingCart, BadgeDollarSign, FileText, Award } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { SupplierMarketplaceProfile } from '@/types/supplier-marketplace';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';

export default function SupplierDashboardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<SupplierMarketplaceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from('supplier_marketplace_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      if (error || !data) {
        setLoading(false);
        return;
      }
      const r = data as any;
      setProfile({
        id: r.id,
        userId: r.user_id,
        businessName: r.business_name,
        slug: r.slug,
        categoryFocus: r.category_focus,
        country: r.country,
        city: r.city,
        region: r.region,
        address: r.address,
        email: r.email,
        phone: r.phone,
        whatsapp: r.whatsapp,
        description: r.description,
        logoUrl: r.logo_url,
        coverUrl: r.cover_url,
        status: r.status,
        verificationLevel: r.verification_level ?? 0,
        verificationBadgeText: r.verification_badge_text,
        trustScore: r.trust_score ?? 0,
        featured: r.featured ?? false,
        adminNotes: r.admin_notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Loading dashboard...</Text>
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No supplier profile</Text>
        <Text style={[styles.emptyBody, { color: theme.text.secondary }]}>You need an approved supplier profile to use this dashboard.</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
          onPress={() => router.replace('/suppliers-marketplace/become-a-supplier' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Apply to become a supplier</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const links = [
    { title: 'My Store', subtitle: 'Edit profile & visibility', icon: Store, route: '/supplier/store', gradient: ['#0EA5E9', '#0284C7'] as [string, string] },
    { title: 'Inbox', subtitle: 'Messages from buyers', icon: MessageSquare, route: '/supplier/inbox', gradient: ['#8B5CF6', '#7C3AED'] as [string, string] },
    { title: 'Requests for quote', subtitle: 'View and respond to RFQs', icon: FileText, route: '/supplier/rfqs', gradient: ['#0EA5E9', '#0284C7'] as [string, string] },
    { title: 'Complaints', subtitle: 'View and respond to complaints', icon: AlertCircle, route: '/supplier/complaints', gradient: ['#F59E0B', '#D97706'] as [string, string] },
    { title: 'Updates', subtitle: 'Post announcements to followers', icon: Radio, route: '/supplier/updates', gradient: ['#8B5CF6', '#7C3AED'] as [string, string] },
    { title: 'My Products', subtitle: 'Add and manage products', icon: Package, route: '/supplier/products', gradient: ['#10B981', '#059669'] as [string, string] },
    { title: 'Subcategories', subtitle: 'Organize under categories', icon: Layers, route: '/supplier/subcategories', gradient: ['#8B5CF6', '#7C3AED'] as [string, string] },
    { title: 'Subscription', subtitle: 'Plan & payment', icon: CreditCard, route: '/supplier/subscription', gradient: ['#F59E0B', '#D97706'] as [string, string] },
    { title: 'Ads', subtitle: 'Promote your store', icon: Megaphone, route: '/supplier/ads', gradient: ['#EC4899', '#DB2777'] as [string, string] },
    { title: 'Sponsored', subtitle: 'Request sponsored placement', icon: BadgeDollarSign, route: '/supplier/promote', gradient: ['#F59E0B', '#D97706'] as [string, string] },
    { title: 'Analytics', subtitle: 'Views & clicks', icon: BarChart3, route: '/supplier/analytics', gradient: ['#6366F1', '#4F46E5'] as [string, string] },
    { title: 'Purchase orders', subtitle: 'Accept or reject orders', icon: ShoppingCart, route: '/supplier/purchase-orders', gradient: ['#10B981', '#059669'] as [string, string] },
    { title: 'Performance', subtitle: 'Score, badges & how to improve', icon: Award, route: '/supplier/performance', gradient: ['#F59E0B', '#D97706'] as [string, string] },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier Dashboard"
        subtitle={profile.businessName}
        icon={Store}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.inverse} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.card, { backgroundColor: theme.background.card }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconWrap, { backgroundColor: theme.surface.info }]}>
                <Icon size={22} color={theme.accent.primary} strokeWidth={2} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{item.title}</Text>
                <Text style={[styles.cardSub, { color: theme.text.secondary }]}>{item.subtitle}</Text>
              </View>
              <ChevronRight size={20} color={theme.text.tertiary} strokeWidth={2} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    minHeight: minTouchTarget,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.cardTitle },
  cardSub: { ...typography.caption, marginTop: spacing.xxs },
  loadingLabel: { marginTop: spacing.sm, ...typography.caption },
  emptyTitle: { ...typography.sectionTitle, marginBottom: spacing.xs, textAlign: 'center' },
  emptyBody: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.md },
  primaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minHeight: minTouchTarget,
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
