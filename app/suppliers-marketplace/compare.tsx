import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Package, GitCompare } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { StorageImage } from '@/components/StorageImage';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { supabase } from '@/lib/supabase';

type CompareRow = {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  min_order_qty: number;
  unit_type: string | null;
  lead_time_days: number | null;
  price_type: string | null;
  image_urls: string[];
  supplier_profile_id: string;
  supplier_name: string;
};

export default function CompareSuppliersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { name, subcategoryId } = useLocalSearchParams<{ name?: string; subcategoryId?: string }>();
  const { isFeatureVisible } = useFeatures();
  const [products, setProducts] = useState<CompareRow[]>([]);
  const [loading, setLoading] = useState(true);

  const canCompare = isFeatureVisible('supplier-compare') ?? true;

  useEffect(() => {
    if (!canCompare) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from('supplier_marketplace_products')
        .select('id, name, price, currency, min_order_qty, unit_type, lead_time_days, price_type, image_urls, supplier_profile_id, supplier_marketplace_profiles!inner(business_name)')
        .eq('status', 'published')
        .limit(20);
      if (subcategoryId) {
        q = q.eq('subcategory_id', subcategoryId);
      } else if (name && name.trim()) {
        q = q.ilike('name', `%${name.trim()}%`);
      } else {
        setProducts([]);
        setLoading(false);
        return;
      }
      const { data, error } = await q;
      if (error) {
        setProducts([]);
        setLoading(false);
        return;
      }
      const rows: CompareRow[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price != null ? Number(p.price) : null,
        currency: p.currency || 'USD',
        min_order_qty: p.min_order_qty ?? 1,
        unit_type: p.unit_type ?? null,
        lead_time_days: p.lead_time_days ?? null,
        price_type: p.price_type ?? null,
        image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
        supplier_profile_id: p.supplier_profile_id,
        supplier_name: p.supplier_marketplace_profiles?.business_name ?? 'Supplier',
      }));
      setProducts(rows);
      setLoading(false);
    };
    load();
  }, [canCompare, name, subcategoryId]);

  if (!canCompare) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Compare suppliers is not available.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Compare suppliers"
        subtitle={name ? `Products like "${name}"` : subcategoryId ? 'Same category' : 'Enter a product name'}
        icon={GitCompare}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {!name?.trim() && !subcategoryId ? (
            <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
              <Package size={48} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                Open "Compare suppliers" from a product page to see similar products from other suppliers.
              </Text>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent.primary, marginTop: 16 }]} onPress={() => router.back()}>
                <Text style={styles.primaryBtnText}>Browse marketplace</Text>
              </TouchableOpacity>
            </View>
          ) : products.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No other products found to compare.</Text>
            </View>
          ) : (
            products.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.card, { backgroundColor: theme.background.card }]}
                onPress={() => router.push(`/suppliers-marketplace/product/${p.id}` as any)}
              >
                <StorageImage uri={p.image_urls[0]} bucket="product" style={styles.thumb} resizeMode="cover" placeholderIcon="package" />
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={2}>{p.name}</Text>
                  <Text style={[styles.supplierName, { color: theme.text.tertiary }]}>{p.supplier_name}</Text>
                  {p.price != null && (
                    <Text style={[styles.price, { color: theme.accent.primary }]}>
                      {p.currency} {p.price.toLocaleString()}
                      {p.price_type === 'negotiable' && ' (negotiable)'}
                    </Text>
                  )}
                  <View style={styles.meta}>
                    {p.unit_type && <Text style={[styles.metaText, { color: theme.text.tertiary }]}>Per {p.unit_type}</Text>}
                    {p.lead_time_days != null && <Text style={[styles.metaText, { color: theme.text.tertiary }]}>Lead: {p.lead_time_days}d</Text>}
                    <Text style={[styles.metaText, { color: theme.text.tertiary }]}>MOQ: {p.min_order_qty}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  empty: { padding: 24, borderRadius: 12, alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 12 },
  primaryBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  card: { flexDirection: 'row', padding: 12, borderRadius: 12, marginBottom: 10 },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  thumbPlaceholder: { width: 80, height: 80, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  supplierName: { fontSize: 13, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaText: { fontSize: 12 },
});
