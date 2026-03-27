import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, Eye, MousePointerClick, Phone, Mail, Globe, FileText, ShoppingCart, Users, Package, TrendingUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import PageHeader from '@/components/PageHeader';
import { StorageImage } from '@/components/StorageImage';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type ProductStats = {
  id: string;
  name: string;
  status: string;
  image_urls: string[];
  views: number;
  rfqs: number;
};

const EVENT_LABELS: Record<string, { label: string; icon: typeof Eye }> = {
  profile_view: { label: 'Store profile views', icon: Eye },
  product_view: { label: 'Product views', icon: BarChart3 },
  contact_call: { label: 'Call clicks', icon: Phone },
  contact_email: { label: 'Email clicks', icon: Mail },
  contact_whatsapp: { label: 'WhatsApp clicks', icon: MousePointerClick },
  contact_website: { label: 'Website clicks', icon: Globe },
  rfq_created: { label: 'RFQs received', icon: FileText },
  rfq_response: { label: 'Quotes sent', icon: FileText },
  follow: { label: 'New followers', icon: Users },
};

const RANGES = [{ key: '7', label: '7 days' }, { key: '30', label: '30 days' }] as const;

export default function SupplierAnalyticsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [rfqTotal, setRfqTotal] = useState(0);
  const [rfqQuoted, setRfqQuoted] = useState(0);
  const [poCount, setPoCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<7 | 30>(30);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      if (data) setProfileId(data.id);
      setLoading(false);
    };
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    if (!profileId) return;
    const load = async () => {
      const since = new Date();
      since.setDate(since.getDate() - rangeDays);
      const sinceIso = since.toISOString();
      const [
        { data: events, error: eventsErr },
        { count: rfqTotalCount },
        { count: rfqQuotedCount },
        { count: poCountRes },
        { count: followerCountRes },
        { data: productsData },
        { data: viewEvents },
        { data: rfqData },
      ] = await Promise.all([
        supabase.from('supplier_analytics_events').select('event_type').eq('supplier_profile_id', profileId).gte('created_at', sinceIso),
        supabase.from('supplier_rfqs').select('*', { count: 'exact', head: true }).eq('supplier_profile_id', profileId).gte('created_at', sinceIso),
        supabase.from('supplier_rfqs').select('*', { count: 'exact', head: true }).eq('supplier_profile_id', profileId).eq('status', 'quoted').gte('created_at', sinceIso),
        supabase.from('supplier_purchase_orders').select('*', { count: 'exact', head: true }).eq('supplier_id', profileId).gte('created_at', sinceIso),
        supabase.from('buyer_followed_suppliers').select('*', { count: 'exact', head: true }).eq('supplier_profile_id', profileId),
        supabase.from('supplier_marketplace_products').select('id, name, status, image_urls').eq('supplier_profile_id', profileId).in('status', ['published', 'draft']).order('created_at', { ascending: false }),
        supabase.from('supplier_analytics_events').select('product_id').eq('supplier_profile_id', profileId).eq('event_type', 'product_view').gte('created_at', sinceIso).not('product_id', 'is', null),
        supabase.from('supplier_rfqs').select('product_id').eq('supplier_profile_id', profileId).gte('created_at', sinceIso).not('product_id', 'is', null),
      ]);
      if (!eventsErr && events) {
        const byType: Record<string, number> = {};
        events.forEach((row: any) => {
          byType[row.event_type] = (byType[row.event_type] || 0) + 1;
        });
        setCounts(byType);
      }
      setRfqTotal(rfqTotalCount ?? 0);
      setRfqQuoted(rfqQuotedCount ?? 0);
      setPoCount(poCountRes ?? 0);
      setFollowerCount(followerCountRes ?? 0);

      const viewByProduct: Record<string, number> = {};
      (viewEvents || []).forEach((r: any) => {
        if (r.product_id) viewByProduct[r.product_id] = (viewByProduct[r.product_id] || 0) + 1;
      });
      const rfqByProduct: Record<string, number> = {};
      (rfqData || []).forEach((r: any) => {
        if (r.product_id) rfqByProduct[r.product_id] = (rfqByProduct[r.product_id] || 0) + 1;
      });
      const stats: ProductStats[] = (productsData || []).map((p: any) => ({
        id: p.id,
        name: p.name || 'Untitled',
        status: p.status || 'draft',
        image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
        views: viewByProduct[p.id] || 0,
        rfqs: rfqByProduct[p.id] || 0,
      }));
      stats.sort((a, b) => (b.views + b.rfqs * 5) - (a.views + a.rfqs * 5));
      setProductStats(stats);
    };
    load();
  }, [profileId, rangeDays]);

  if (loading && !profileId) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!profileId) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>No approved supplier profile.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const contactTotal = (counts.contact_call || 0) + (counts.contact_email || 0) + (counts.contact_whatsapp || 0) + (counts.contact_website || 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <PageHeader
        title="Analytics"
        subtitle="Views & clicks"
        icon={BarChart3}
        iconGradient={['#6366F1', '#4F46E5']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.rangeChip, rangeDays === Number(r.key) && { backgroundColor: theme.accent.primary }]}
            onPress={() => setRangeDays(Number(r.key) as 7 | 30)}
          >
            <Text style={[styles.rangeChipText, { color: rangeDays === Number(r.key) ? '#FFF' : theme.text.secondary }]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Total events</Text>
          <Text style={[styles.bigNumber, { color: theme.accent.primary }]}>{total}</Text>
          <Text style={[styles.muted, { color: theme.text.tertiary }]}>Last {rangeDays} days</Text>
        </View>
        {(['profile_view', 'product_view'] as const).map((eventType) => {
          const config = EVENT_LABELS[eventType];
          const Icon = config?.icon ?? BarChart3;
          const value = counts[eventType] ?? 0;
          return (
            <View key={eventType} style={[styles.card, { backgroundColor: theme.background.card }]}>
              <View style={styles.row}>
                <Icon size={22} color={theme.accent.primary} />
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{config?.label ?? eventType}</Text>
              </View>
              <Text style={[styles.number, { color: theme.text.primary }]}>{value}</Text>
            </View>
          );
        })}
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Contact clicks (total)</Text>
          <Text style={[styles.number, { color: theme.text.primary }]}>{contactTotal}</Text>
          <View style={styles.contactBreakdown}>
            <Text style={[styles.muted, { color: theme.text.tertiary }]}>Call: {counts.contact_call ?? 0}</Text>
            <Text style={[styles.muted, { color: theme.text.tertiary }]}>Email: {counts.contact_email ?? 0}</Text>
            <Text style={[styles.muted, { color: theme.text.tertiary }]}>WhatsApp: {counts.contact_whatsapp ?? 0}</Text>
            <Text style={[styles.muted, { color: theme.text.tertiary }]}>Website: {counts.contact_website ?? 0}</Text>
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <View style={styles.row}>
            <FileText size={22} color={theme.accent.primary} />
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>RFQs received</Text>
          </View>
          <Text style={[styles.number, { color: theme.text.primary }]}>{rfqTotal}</Text>
          <Text style={[styles.muted, { color: theme.text.tertiary }]}>
            {rfqTotal > 0 ? `${rfqQuoted} quoted (${Math.round((rfqQuoted / rfqTotal) * 100)}% conversion)` : 'Last ' + rangeDays + ' days'}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <View style={styles.row}>
            <ShoppingCart size={22} color={theme.accent.primary} />
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Purchase orders</Text>
          </View>
          <Text style={[styles.number, { color: theme.text.primary }]}>{poCount}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <View style={styles.row}>
            <Users size={22} color={theme.accent.primary} />
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Followers</Text>
          </View>
          <Text style={[styles.number, { color: theme.text.primary }]}>{followerCount}</Text>
        </View>

        {productStats.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <View style={styles.productPerfHeader}>
              <View style={styles.row}>
                <TrendingUp size={22} color={theme.accent.primary} />
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Product performance</Text>
              </View>
              <Text style={[styles.muted, { color: theme.text.tertiary }]}>Views & RFQs · Last {rangeDays} days</Text>
            </View>
            {productStats.slice(0, 10).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.productStatRow, { borderBottomColor: theme.border.light }]}
                onPress={() => router.push({ pathname: '/supplier/products/[id]', params: { id: p.id } } as any)}
              >
                <StorageImage uri={p.image_urls?.[0]} bucket="product" style={styles.productStatThumb} resizeMode="cover" placeholderIcon="package" />
                <View style={styles.productStatBody}>
                  <Text style={[styles.productStatName, { color: theme.text.primary }]} numberOfLines={2}>{p.name}</Text>
                  <View style={styles.productStatMeta}>
                    <View style={[styles.productStatBadge, { backgroundColor: theme.surface.info }]}>
                      <Eye size={12} color={theme.accent.primary} />
                      <Text style={[styles.productStatBadgeText, { color: theme.accent.primary }]}>{p.views}</Text>
                    </View>
                    <View style={[styles.productStatBadge, { backgroundColor: p.rfqs > 0 ? '#D1FAE5' : theme.background.secondary }]}>
                      <FileText size={12} color={p.rfqs > 0 ? '#065F46' : theme.text.tertiary} />
                      <Text style={[styles.productStatBadgeText, { color: p.rfqs > 0 ? '#065F46' : theme.text.tertiary }]}>{p.rfqs} RFQ{p.rfqs !== 1 ? 's' : ''}</Text>
                    </View>
                    {p.status === 'draft' && (
                      <Text style={[styles.productStatStatus, { color: theme.text.tertiary }]}>Draft</Text>
                    )}
                  </View>
                </View>
                <Package size={16} color={theme.text.tertiary} />
              </TouchableOpacity>
            ))}
            {productStats.length > 10 && (
              <Text style={[styles.muted, { color: theme.text.tertiary }]}>{productStats.length - 10} more products</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rangeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  rangeChipText: { fontSize: 14, fontWeight: '500' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bigNumber: { fontSize: 32, fontWeight: '700', marginTop: 4 },
  number: { fontSize: 24, fontWeight: '600', marginTop: 4 },
  muted: { fontSize: 13, marginTop: 2 },
  contactBreakdown: { marginTop: 8, gap: 4 },
  productPerfHeader: { marginBottom: 12 },
  productStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  productStatThumb: { width: 48, height: 48, borderRadius: 10 },
  productStatBody: { flex: 1, marginLeft: 12 },
  productStatName: { fontSize: 15, fontWeight: '600' },
  productStatMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  productStatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  productStatBadgeText: { fontSize: 12, fontWeight: '600' },
  productStatStatus: { fontSize: 12 },
});
