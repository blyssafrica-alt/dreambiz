import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type ReviewRow = {
  id: string;
  supplier_profile_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_hidden: boolean;
  created_at: string;
  supplier_marketplace_profiles: { business_name: string } | null;
};

const FILTERS = ['all', 'visible', 'hidden'] as const;

export default function AdminSupplierReviewsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    const q = supabase
      .from('supplier_marketplace_reviews')
      .select('id, supplier_profile_id, rating, title, body, is_hidden, created_at, supplier_marketplace_profiles(business_name)')
      .order('created_at', { ascending: false });

    if (filter === 'visible') q.eq('is_hidden', false);
    if (filter === 'hidden') q.eq('is_hidden', true);

    const { data, error } = await q;
    if (!error && data) setList(data as ReviewRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const setHidden = async (id: string, hidden: boolean) => {
    setActingId(id);
    try {
      const { error } = await supabase
        .from('supplier_marketplace_reviews')
        .update({ is_hidden: hidden, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setList((prev) => prev.map((r) => (r.id === id ? { ...r, is_hidden: hidden } : r)));
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to update');
    } finally {
      setActingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier Reviews"
        subtitle="Hide or show reviews"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && { backgroundColor: theme.accent.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, { color: filter === f ? '#FFF' : theme.text.secondary }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {list.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No reviews match this filter.</Text>
          ) : (
            list.map((r) => {
              const acting = actingId === r.id;
              return (
                <View key={r.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.businessName, { color: theme.text.primary }]}>{r.supplier_marketplace_profiles?.business_name ?? '—'}</Text>
                    <Text style={[styles.rating, { color: theme.text.secondary }]}>{r.rating} ★</Text>
                  </View>
                  {r.title ? <Text style={[styles.title, { color: theme.text.primary }]}>{r.title}</Text> : null}
                  {r.body ? <Text style={[styles.body, { color: theme.text.secondary }]} numberOfLines={3}>{r.body}</Text> : null}
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>{new Date(r.created_at).toLocaleDateString()} {r.is_hidden ? '· Hidden' : ''}</Text>
                  <View style={styles.actions}>
                    {r.is_hidden ? (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => setHidden(r.id, false)} disabled={acting}>
                        {acting ? <ActivityIndicator size="small" color="#065F46" /> : <><Eye size={18} color="#065F46" /><Text style={[styles.actionBtnText, { color: '#065F46' }]}>Show</Text></>}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => setHidden(r.id, true)} disabled={acting}>
                        {acting ? <ActivityIndicator size="small" color="#991B1B" /> : <><EyeOff size={18} color="#991B1B" /><Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Hide</Text></>}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterChipText: { fontSize: 14, fontWeight: '500' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', padding: 24 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  businessName: { fontSize: 16, fontWeight: '600' },
  rating: { fontSize: 14 },
  title: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  body: { fontSize: 14, marginTop: 4 },
  muted: { fontSize: 12, marginTop: 6 },
  actions: { marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionBtnText: { fontWeight: '600', fontSize: 14 },
});
