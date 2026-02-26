import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle, Pause, Ban, CreditCard, Settings } from 'lucide-react-native';
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
import { spacing, radius, typography } from '@/constants/layout';

type Row = {
  id: string;
  supplier_id: string;
  placement: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status: string;
  price_amount: number | null;
  currency: string | null;
  rejected_reason: string | null;
  approved_at: string | null;
  supplier_marketplace_profiles: { business_name: string } | null;
};

const STATUS_FILTERS = [
  'pending_payment',
  'pending_admin_approval',
  'approved',
  'rejected',
  'active',
  'expired',
  'cancelled',
  'all',
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pending payment',
  pending_admin_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  all: 'All',
};

export default function AdminSupplierSponsoredPlacementsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('pending_admin_approval');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    let q = supabase
      .from('supplier_sponsored_placements')
      .select(
        'id, supplier_id, placement, starts_at, ends_at, status, payment_status, price_amount, currency, rejected_reason, approved_at, supplier_marketplace_profiles(business_name)'
      )
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (!error && data) setList(data as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [statusFilter]);

  const approve = async (id: string) => {
    setActingId(id);
    try {
      const { data, error } = await supabase.rpc('supplier_sponsored_placement_admin_approve', {
        placement_id: id,
        admin_reject_reason: null,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; action?: string };
      if (!result?.ok) throw new Error(result?.error ?? 'Failed');
      setList((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved', approved_at: new Date().toISOString() } : r)));
    } catch (e: any) {
      RNAlert.alert('Error', e?.message ?? 'Failed to approve');
    } finally {
      setActingId(null);
    }
  };

  const reject = (id: string, reason?: string) => {
    const doReject = async (rejectReason: string) => {
      setActingId(id);
      try {
        const { data, error } = await supabase.rpc('supplier_sponsored_placement_admin_approve', {
          placement_id: id,
          admin_reject_reason: rejectReason || 'Rejected by admin',
        });
        if (error) throw error;
        const result = data as { ok: boolean; error?: string };
        if (!result?.ok) throw new Error(result?.error ?? 'Failed');
        setList((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected', rejected_reason: rejectReason || null } : r)));
      } catch (e: any) {
        RNAlert.alert('Error', e?.message ?? 'Failed to reject');
      } finally {
        setActingId(null);
      }
    };
    if (reason !== undefined) {
      doReject(reason);
      return;
    }
    RNAlert.alert('Reject placement', 'Reject this placement? The supplier will see a generic rejection reason unless you add one in a follow-up.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => doReject('Rejected by admin') },
    ]);
  };

  const setStatus = async (id: string, newStatus: 'cancelled' | 'expired' | 'paused') => {
    setActingId(id);
    try {
      const { data, error } = await supabase.rpc('supplier_sponsored_placement_admin_set_status', {
        p_placement_id: id,
        p_new_status: newStatus,
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) throw new Error(result?.error ?? 'Failed');
      setList((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    } catch (e: any) {
      RNAlert.alert('Error', e?.message ?? 'Failed to update');
    } finally {
      setActingId(null);
    }
  };

  const canApprove = (r: Row) => r.status === 'pending_admin_approval' && r.payment_status === 'paid';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Sponsored placements"
        subtitle="Paid placements · Approve only after payment. New requests appear here."
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={() => router.push('/admin/supplier-placement-tiers' as any)}>
            <Settings size={22} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersWrap} contentContainerStyle={styles.filters}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && { backgroundColor: theme.accent.primary }]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, { color: statusFilter === f ? '#FFF' : theme.text.secondary }]}>
              {STATUS_LABELS[f] ?? f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {list.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No placements match.</Text>
          ) : (
            list.map((r) => (
              <View key={r.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.title, { color: theme.text.primary }]}>{r.supplier_marketplace_profiles?.business_name ?? '—'}</Text>
                <Text style={[styles.muted, { color: theme.text.tertiary }]}>
                  {r.placement.replace(/_/g, ' ')} · {r.status} · {r.payment_status}
                  {r.price_amount != null && ` · ${r.currency ?? 'USD'} ${Number(r.price_amount).toFixed(2)}`}
                </Text>
                <Text style={[styles.dates, { color: theme.text.secondary }]}>
                  {new Date(r.starts_at).toLocaleDateString()} – {new Date(r.ends_at).toLocaleDateString()}
                </Text>
                {r.rejected_reason ? (
                  <Text style={[styles.reason, { color: theme.text.secondary }]}>Rejection reason: {r.rejected_reason}</Text>
                ) : null}
                {r.approved_at ? (
                  <Text style={[styles.approvedAt, { color: theme.text.tertiary }]}>Approved {new Date(r.approved_at).toLocaleDateString()}</Text>
                ) : null}

                <View style={styles.actions}>
                  {canApprove(r) && (
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: '#D1FAE5' }]}
                      onPress={() => approve(r.id)}
                      disabled={actingId === r.id}
                    >
                      {actingId === r.id ? <ActivityIndicator size="small" color="#065F46" /> : <CheckCircle size={18} color="#065F46" />}
                      <Text style={[styles.btnText, { color: '#065F46' }]}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {r.status === 'pending_admin_approval' && (
                    <TouchableOpacity
                      style={[styles.btn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => reject(r.id)}
                      disabled={actingId === r.id}
                    >
                      <XCircle size={18} color="#991B1B" />
                      <Text style={[styles.btnText, { color: '#991B1B' }]}>Reject</Text>
                    </TouchableOpacity>
                  )}
                  {r.payment_status !== 'paid' && r.status === 'pending_payment' && (
                    <View style={[styles.badge, { backgroundColor: theme.surface.warning }]}>
                      <CreditCard size={14} color={theme.text.inverse} />
                      <Text style={[styles.badgeText, { color: theme.text.inverse }]}>Awaiting payment</Text>
                    </View>
                  )}
                  {['approved', 'active', 'pending_admin_approval'].includes(r.status) && (
                    <>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: theme.background.tertiary }]}
                        onPress={() => setStatus(r.id, 'paused')}
                        disabled={actingId === r.id}
                      >
                        <Pause size={18} color={theme.text.secondary} />
                        <Text style={[styles.btnText, { color: theme.text.secondary }]}>Pause</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => setStatus(r.id, 'cancelled')}
                        disabled={actingId === r.id}
                      >
                        <Ban size={18} color="#991B1B" />
                        <Text style={[styles.btnText, { color: '#991B1B' }]}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filtersWrap: { maxHeight: 48, marginBottom: spacing.xs },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { textAlign: 'center', padding: spacing.lg },
  card: { padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  title: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 13, marginTop: 4 },
  dates: { fontSize: 12, marginTop: 2, color: '#666' },
  reason: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  approvedAt: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { fontWeight: '600', fontSize: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
