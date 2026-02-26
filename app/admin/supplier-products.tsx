import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type ProductRow = {
  id: string;
  supplier_profile_id: string;
  name: string;
  status: string;
  price: number | null;
  currency: string | null;
  admin_notes: string | null;
  created_at: string;
  supplier_marketplace_profiles: { business_name: string } | null;
};

const STATUS_FILTERS = ['pending', 'published', 'draft', 'rejected', 'all'] as const;

export default function AdminSupplierProductsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('pending');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    let q = supabase
      .from('supplier_marketplace_products')
      .select('id, supplier_profile_id, name, status, price, currency, admin_notes, created_at, supplier_marketplace_profiles(business_name)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }
    const { data, error } = await q;
    if (!error && data) {
      setList(data as ProductRow[]);
      setNotesMap((prev) => {
        const next = { ...prev };
        (data as ProductRow[]).forEach((p) => {
          if (p.admin_notes != null && next[p.id] === undefined) next[p.id] = p.admin_notes;
        });
        return next;
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string, adminNote?: string) => {
    setActingId(id);
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (adminNote !== undefined) payload.admin_notes = adminNote?.trim() || null;
      const { error } = await supabase.from('supplier_marketplace_products').update(payload).eq('id', id);
      if (error) throw error;
      setList((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus, admin_notes: payload.admin_notes as string ?? p.admin_notes } : p)));
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to update');
    } finally {
      setActingId(null);
    }
  };

  const approveProduct = (row: ProductRow) => {
    RNAlert.alert('Publish product', `Make "${row.name}" visible in the marketplace?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Publish', onPress: () => updateStatus(row.id, 'published', notesMap[row.id]) },
    ]);
  };

  const rejectProduct = (row: ProductRow) => {
    const note = notesMap[row.id] ?? row.admin_notes ?? '';
    RNAlert.alert('Reject product', 'Optionally add a note for the supplier:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          const finalNote = note.trim() || undefined;
          updateStatus(row.id, 'rejected', finalNote);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier Products"
        subtitle="Moderate marketplace products"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && { backgroundColor: theme.accent.primary }]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, { color: statusFilter === f ? '#FFF' : theme.text.secondary }]}>{f}</Text>
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
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No products match this filter.</Text>
          ) : (
            list.map((p) => {
              const acting = actingId === p.id;
              return (
                <View key={p.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.productName, { color: theme.text.primary }]} numberOfLines={2}>{p.name}</Text>
                    <Text style={[styles.statusBadge, { color: theme.text.tertiary }]}>{p.status}</Text>
                  </View>
                  <Text style={[styles.supplierName, { color: theme.text.secondary }]}>{p.supplier_marketplace_profiles?.business_name ?? '—'}</Text>
                  {p.price != null && (
                    <Text style={[styles.muted, { color: theme.text.tertiary }]}>{p.currency || 'USD'} {Number(p.price).toLocaleString()}</Text>
                  )}
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>{new Date(p.created_at).toLocaleDateString()}</Text>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Admin notes (for reject reason, etc.)</Text>
                  <TextInput
                    style={[styles.notesInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="Optional note to supplier"
                    placeholderTextColor={theme.text.tertiary}
                    value={notesMap[p.id] ?? p.admin_notes ?? ''}
                    onChangeText={(t) => setNotesMap((prev) => ({ ...prev, [p.id]: t }))}
                    multiline
                  />
                  <View style={styles.actions}>
                    {(p.status === 'pending' || p.status === 'draft') && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}
                        onPress={() => approveProduct(p)}
                        disabled={acting}
                      >
                        {acting ? <ActivityIndicator size="small" color="#065F46" /> : <><CheckCircle size={18} color="#065F46" /><Text style={[styles.actionBtnText, { color: '#065F46' }]}>Publish</Text></>}
                      </TouchableOpacity>
                    )}
                    {p.status === 'published' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.surface.info }]}
                        onPress={() => updateStatus(p.id, 'draft')}
                        disabled={acting}
                      >
                        <Text style={[styles.actionBtnText, { color: theme.accent.primary }]}>Unpublish</Text>
                      </TouchableOpacity>
                    )}
                    {(p.status === 'pending' || p.status === 'draft') && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => rejectProduct(p)}
                        disabled={acting}
                      >
                        <XCircle size={18} color="#991B1B" />
                        <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Reject</Text>
                      </TouchableOpacity>
                    )}
                    {p.status === 'rejected' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}
                        onPress={() => updateStatus(p.id, 'pending', notesMap[p.id])}
                        disabled={acting}
                      >
                        <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Move to pending</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 16, fontWeight: '600', flex: 1 },
  statusBadge: { fontSize: 12 },
  supplierName: { fontSize: 14, marginTop: 4 },
  muted: { fontSize: 12, marginTop: 4 },
  label: { fontSize: 12, marginTop: 10, marginBottom: 4 },
  notesInput: { padding: 10, borderRadius: 8, fontSize: 14, minHeight: 50, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionBtnText: { fontWeight: '600', fontSize: 14 },
});
