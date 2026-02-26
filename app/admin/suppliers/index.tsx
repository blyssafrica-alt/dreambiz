import { useRouter } from 'expo-router';
import { ArrowLeft, Truck, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { supabase } from '@/lib/supabase';

type Status = 'pending' | 'approved' | 'declined' | 'suspended';

interface Row {
  id: string;
  business_name: string;
  email: string;
  status: Status;
  created_at: string;
}

export default function AdminSuppliersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isFeatureVisible } = useFeatures();
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | 'all'>('pending');
  const [search, setSearch] = useState('');

  const canAccess = isFeatureVisible('supplier-admin');

  useEffect(() => {
    if (!canAccess) return;
    const load = async () => {
      setLoading(true);
      let q = supabase.from('supplier_marketplace_profiles').select('id, business_name, email, status, created_at').order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('status', filter);
      const { data, error } = await q;
      if (!error && data) setList(data as Row[]);
      setLoading(false);
    };
    load();
  }, [canAccess, filter]);

  if (!canAccess) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Access denied. Supplier admin feature required.</Text>
      </View>
    );
  }

  const filtered = search ? list.filter(r => r.business_name.toLowerCase().includes(search.toLowerCase()) || (r.email && r.email.toLowerCase().includes(search.toLowerCase()))) : list;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Suppliers"
        subtitle="Profiles · Use «New applications» for wizard submissions"
        icon={Truck}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={<TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color={theme.text.primary} /></TouchableOpacity>}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.quickLinks, { backgroundColor: theme.background.card }]} contentContainerStyle={styles.quickLinksContent}>
        <TouchableOpacity style={[styles.quickLinkChip, { backgroundColor: theme.background.secondary }]} onPress={() => router.push('/admin/supplier-applications' as any)}>
          <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>New applications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickLinkChip, { backgroundColor: theme.background.secondary }]} onPress={() => router.push('/admin/supplier-categories' as any)}>
          <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickLinkChip, { backgroundColor: theme.background.secondary }]} onPress={() => router.push('/admin/supplier-subscription-plans' as any)}>
          <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickLinkChip, { backgroundColor: theme.background.secondary }]} onPress={() => router.push('/admin/subscription-promotions' as any)}>
          <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>Promotions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickLinkChip, { backgroundColor: theme.background.secondary }]} onPress={() => router.push('/admin/supplier-subscriptions' as any)}>
          <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>Subscriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickLinkChip, { backgroundColor: theme.background.secondary }]} onPress={() => router.push('/admin/supplier-reviews' as any)}>
          <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>Reviews</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickLinkChip, { backgroundColor: theme.background.secondary }]} onPress={() => router.push('/admin/supplier-complaints' as any)}>
          <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>Complaints</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={[styles.filterRow, { backgroundColor: theme.background.card }]}>
        <View style={styles.searchWrap}>
          <Search size={18} color={theme.text.tertiary} />
          <TextInput style={[styles.searchInput, { color: theme.text.primary }]} placeholder="Search..." placeholderTextColor={theme.text.tertiary} value={search} onChangeText={setSearch} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {(['pending', 'approved', 'declined', 'suspended', 'all'] as const).map((s) => (
            <TouchableOpacity key={s} style={[styles.chip, filter === s && { backgroundColor: theme.accent.primary }]} onPress={() => setFilter(s)}>
              <Text style={[styles.chipText, { color: filter === s ? '#FFF' : theme.text.secondary }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.accent.primary} /></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {filtered.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No suppliers match.</Text>
          ) : (
            filtered.map((r) => (
              <TouchableOpacity key={r.id} style={[styles.card, { backgroundColor: theme.background.card }]} onPress={() => router.push(`/admin/suppliers/${r.id}` as any)}>
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{r.business_name}</Text>
                <Text style={[styles.cardSub, { color: theme.text.secondary }]}>{r.email}</Text>
                <View style={[styles.statusBadge, { backgroundColor: r.status === 'approved' ? '#D1FAE5' : r.status === 'declined' ? '#FEE2E2' : r.status === 'suspended' ? '#FEF3C7' : '#E0E7FF' }]}>
                  <Text style={[styles.statusText, { color: r.status === 'approved' ? '#065F46' : r.status === 'declined' ? '#991B1B' : r.status === 'suspended' ? '#92400E' : '#3730A3' }]}>{r.status}</Text>
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
  quickLinks: { maxHeight: 44, marginBottom: 4 },
  quickLinksContent: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  quickLinkChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  quickLinkText: { fontSize: 13, fontWeight: '500' },
  filterRow: { padding: 16, marginBottom: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 13, marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', padding: 24 },
});
