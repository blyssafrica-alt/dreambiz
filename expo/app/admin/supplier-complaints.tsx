import { useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, CheckCircle, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

type ComplaintRow = {
  id: string;
  supplier_profile_id: string;
  user_id: string;
  subject: string;
  description: string;
  order_reference: string | null;
  evidence_urls: string[];
  supplier_response: string | null;
  supplier_evidence_urls: string[];
  supplier_responded_at: string | null;
  status: string;
  admin_notes: string | null;
  admin_action: string | null;
  resolved_at: string | null;
  created_at: string;
  supplier_marketplace_profiles: { business_name: string; user_id: string } | null;
};

const STATUS_FILTERS = ['open', 'in_review', 'supplier_response', 'resolved', 'dismissed', 'all'] as const;
const ADMIN_ACTIONS = ['none', 'warn', 'suspend', 'ban'] as const;

export default function AdminSupplierComplaintsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [list, setList] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('open');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    let q = supabase
      .from('supplier_marketplace_complaints')
      .select('id, supplier_profile_id, user_id, subject, description, order_reference, evidence_urls, supplier_response, supplier_evidence_urls, supplier_responded_at, status, admin_notes, admin_action, resolved_at, created_at, supplier_marketplace_profiles(business_name, user_id)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }
    const { data, error } = await q;
    if (!error && data) {
      setList(data as ComplaintRow[]);
      setNotesMap((prev) => {
        const next = { ...prev };
        (data as ComplaintRow[]).forEach((c) => {
          if (c.admin_notes != null && next[c.id] === undefined) next[c.id] = c.admin_notes;
        });
        return next;
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string, adminAction?: string, row?: ComplaintRow) => {
    if (!user?.id) return;
    setActingId(id);
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        admin_notes: notesMap[id]?.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'resolved' || newStatus === 'dismissed') {
        payload.resolved_at = new Date().toISOString();
        payload.admin_action = adminAction && adminAction !== 'none' ? adminAction : null;
      }
      const { error } = await supabase.from('supplier_marketplace_complaints').update(payload).eq('id', id);
      if (error) throw error;

      if (newStatus === 'resolved' || newStatus === 'dismissed') {
        await supabase.from('supplier_admin_audit_log').insert({
          admin_user_id: user.id,
          action: `complaint_${newStatus}`,
          target_type: 'complaint',
          target_id: id,
          details: { admin_action: adminAction || null, admin_notes: notesMap[id]?.trim() || null },
        });
      }

      const complaintRow = row ?? list.find((c) => c.id === id);
      const buyerUserId = complaintRow?.user_id;
      const supplierUserId = complaintRow?.supplier_marketplace_profiles?.user_id;
      const note = notesMap[id]?.trim();
      const msgResolved = `Your complaint has been resolved.${note ? ` Note: ${note.slice(0, 80)}${note.length > 80 ? '…' : ''}` : ''}`;
      const msgDismissed = `Your complaint was dismissed.${note ? ` ${note.slice(0, 80)}${note.length > 80 ? '…' : ''}` : ''}`;
      const msgSupplier = newStatus === 'resolved'
        ? `A complaint against your store was resolved.${adminAction && adminAction !== 'none' ? ` Action: ${adminAction}.` : ''}`
        : `A complaint against your store was dismissed.${adminAction && adminAction !== 'none' ? ` Action: ${adminAction}.` : ''}`;
      if (buyerUserId) {
        sendNotification({ title: newStatus === 'resolved' ? 'Complaint resolved' : 'Complaint dismissed', message: newStatus === 'resolved' ? msgResolved : msgDismissed, userId: buyerUserId }).catch(() => {});
      }
      if (supplierUserId) {
        sendNotification({ title: 'Complaint update', message: msgSupplier, userId: supplierUserId }).catch(() => {});
      }

      setList((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus, admin_notes: notesMap[id]?.trim() || null, admin_action: (adminAction && adminAction !== 'none' ? adminAction : null) ?? c.admin_action, resolved_at: payload.resolved_at as string } : c)));
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to update');
    } finally {
      setActingId(null);
    }
  };

  const resolveComplaint = (row: ComplaintRow) => {
    RNAlert.alert('Resolve complaint', 'Optional: apply action to supplier', [
      { text: 'Cancel', style: 'cancel' },
      ...ADMIN_ACTIONS.map((a) => ({
        text: a === 'none' ? 'Resolve (no action)' : `Resolve & ${a}`,
        onPress: () => updateStatus(row.id, 'resolved', a, row),
      })),
    ]);
  };

  const dismissComplaint = (row: ComplaintRow) => {
    RNAlert.alert('Dismiss complaint', 'Optional: apply action to supplier', [
      { text: 'Cancel', style: 'cancel' },
      ...ADMIN_ACTIONS.map((a) => ({
        text: a === 'none' ? 'Dismiss (no action)' : `Dismiss & ${a}`,
        onPress: () => updateStatus(row.id, 'dismissed', a, row),
      })),
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier Complaints"
        subtitle="Resolve buyer complaints"
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
            <Text style={[styles.filterChipText, { color: statusFilter === f ? '#FFF' : theme.text.secondary }]}>{f.replace('_', ' ')}</Text>
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
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No complaints match this filter.</Text>
          ) : (
            list.map((c) => {
              const acting = actingId === c.id;
              return (
                <View key={c.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.businessName, { color: theme.text.primary }]}>{c.supplier_marketplace_profiles?.business_name ?? '—'}</Text>
                    <Text style={[styles.statusBadge, { color: theme.text.tertiary }]}>{c.status}</Text>
                  </View>
                  <Text style={[styles.subject, { color: theme.text.primary }]}>{c.subject}</Text>
                  <Text style={[styles.body, { color: theme.text.secondary }]} numberOfLines={4}>{c.description}</Text>
                  {c.order_reference ? (
                    <Text style={[styles.muted, { color: theme.text.tertiary }]}>Order ref: {c.order_reference}</Text>
                  ) : null}
                  {Array.isArray(c.evidence_urls) && c.evidence_urls.length > 0 && (
                    <View style={styles.evidenceLinks}>
                      {c.evidence_urls.map((url, i) => (
                        <TouchableOpacity key={i} onPress={() => Linking.openURL(url)} style={styles.evidenceLink}>
                          <ExternalLink size={14} color={theme.accent.primary} />
                          <Text style={[styles.evidenceLinkText, { color: theme.accent.primary }]}>Evidence {i + 1}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {c.supplier_response != null && (
                    <View style={[styles.supplierResponseBlock, { backgroundColor: theme.background.secondary }]}>
                      <Text style={[styles.label, { color: theme.text.tertiary }]}>Supplier response</Text>
                      <Text style={[styles.body, { color: theme.text.primary }]}>{c.supplier_response}</Text>
                      {Array.isArray(c.supplier_evidence_urls) && c.supplier_evidence_urls.length > 0 && (
                        <View style={styles.evidenceLinks}>
                          {c.supplier_evidence_urls.map((url, i) => (
                            <TouchableOpacity key={i} onPress={() => Linking.openURL(url)} style={styles.evidenceLink}>
                              <ExternalLink size={14} color={theme.accent.primary} />
                              <Text style={[styles.evidenceLinkText, { color: theme.accent.primary }]}>Supplier evidence {i + 1}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {c.supplier_responded_at && (
                        <Text style={[styles.muted, { color: theme.text.tertiary }]}>Responded: {new Date(c.supplier_responded_at).toLocaleString()}</Text>
                      )}
                    </View>
                  )}
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>{new Date(c.created_at).toLocaleDateString()}</Text>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Admin notes</Text>
                  <TextInput
                    style={[styles.notesInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="Internal notes"
                    placeholderTextColor={theme.text.tertiary}
                    value={notesMap[c.id] ?? c.admin_notes ?? ''}
                    onChangeText={(t) => setNotesMap((prev) => ({ ...prev, [c.id]: t }))}
                    multiline
                  />
                  {(c.status === 'open' || c.status === 'in_review' || c.status === 'supplier_response') && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}
                        onPress={() => updateStatus(c.id, c.status === 'open' ? 'in_review' : 'open')}
                        disabled={acting}
                      >
                        <Text style={[styles.actionBtnText, { color: '#065F46' }]}>{c.status === 'open' ? 'Mark in review' : 'Back to open'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => resolveComplaint(c)} disabled={acting}>
                        {acting ? <ActivityIndicator size="small" color="#065F46" /> : <><CheckCircle size={18} color="#065F46" /><Text style={[styles.actionBtnText, { color: '#065F46' }]}>Resolve</Text></>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => dismissComplaint(c)} disabled={acting}>
                        <XCircle size={18} color="#991B1B" />
                        <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  )}
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
  statusBadge: { fontSize: 12 },
  subject: { fontSize: 15, fontWeight: '600', marginTop: 6 },
  body: { fontSize: 14, marginTop: 4 },
  muted: { fontSize: 12, marginTop: 4 },
  label: { fontSize: 12, marginTop: 10, marginBottom: 4 },
  notesInput: { padding: 10, borderRadius: 8, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  evidenceLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  evidenceLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evidenceLinkText: { fontSize: 13 },
  supplierResponseBlock: { padding: 12, borderRadius: 8, marginTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionBtnText: { fontWeight: '600', fontSize: 14 },
});
