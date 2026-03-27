import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Pencil, Merge } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type SubcategoryRow = {
  id: string;
  category_id: string;
  supplier_profile_id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  supplier_marketplace_categories: { name: string } | null;
  supplier_marketplace_profiles: { business_name: string } | null;
};

const STATUS_FILTERS = ['pending', 'approved', 'all'] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export default function AdminSupplierSubcategoryGovernanceScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<SubcategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('pending');
  const [renameModal, setRenameModal] = useState(false);
  const [mergeModal, setMergeModal] = useState(false);
  const [editingRow, setEditingRow] = useState<SubcategoryRow | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameSlug, setRenameSlug] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [targetOptions, setTargetOptions] = useState<SubcategoryRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    let q = supabase
      .from('supplier_marketplace_subcategories')
      .select('id, category_id, supplier_profile_id, name, slug, status, created_at, supplier_marketplace_categories(name), supplier_marketplace_profiles(business_name)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }
    const { data, error } = await q;
    if (!error && data) setList(data as SubcategoryRow[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [statusFilter]);

  const openRename = (row: SubcategoryRow) => {
    setEditingRow(row);
    setRenameName(row.name);
    setRenameSlug(row.slug);
    setRenameModal(true);
  };

  const onRenameNameChange = (t: string) => {
    setRenameName(t);
    setRenameSlug(slugify(t));
  };

  const saveRename = async () => {
    const row = editingRow;
    if (!row) return;
    const trimmedName = renameName.trim();
    const trimmedSlug = slugify(renameSlug.trim() || renameName);
    if (!trimmedName || !trimmedSlug) {
      RNAlert.alert('Required', 'Name and slug are required.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('supplier_marketplace_subcategories')
        .update({ name: trimmedName, slug: trimmedSlug, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      setList((prev) => prev.map((s) => (s.id === row.id ? { ...s, name: trimmedName, slug: trimmedSlug } : s)));
      setRenameModal(false);
      setEditingRow(null);
      RNAlert.alert('Saved', 'Subcategory renamed.');
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const approveSubcategory = async (row: SubcategoryRow) => {
    try {
      const { error } = await supabase
        .from('supplier_marketplace_subcategories')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) throw error;
      setList((prev) => prev.map((s) => (s.id === row.id ? { ...s, status: 'approved' } : s)));
      RNAlert.alert('Approved', `"${row.name}" is now approved.`);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to approve');
    }
  };

  const openMerge = (row: SubcategoryRow) => {
    setEditingRow(row);
    setMergeTargetId(null);
    const loadTargets = async () => {
      const { data } = await supabase
        .from('supplier_marketplace_subcategories')
        .select('id, name, slug, supplier_marketplace_profiles(business_name)')
        .eq('category_id', row.category_id)
        .neq('id', row.id)
        .eq('status', 'approved')
        .order('name');
      setTargetOptions((data as SubcategoryRow[]) || []);
    };
    loadTargets();
    setMergeModal(true);
  };

  const runMerge = async () => {
    const source = editingRow;
    if (!source || !mergeTargetId) {
      RNAlert.alert('Required', 'Select a target subcategory to merge into.');
      return;
    }
    if (mergeTargetId === source.id) {
      RNAlert.alert('Invalid', 'Cannot merge into itself.');
      return;
    }
    setSaving(true);
    try {
      const { error: updateErr } = await supabase
        .from('supplier_marketplace_products')
        .update({ subcategory_id: mergeTargetId, updated_at: new Date().toISOString() })
        .eq('subcategory_id', source.id);
      if (updateErr) throw updateErr;
      const { error: deleteErr } = await supabase.from('supplier_marketplace_subcategories').delete().eq('id', source.id);
      if (deleteErr) throw deleteErr;
      setList((prev) => prev.filter((s) => s.id !== source.id));
      setMergeModal(false);
      setEditingRow(null);
      setMergeTargetId(null);
      RNAlert.alert('Merged', `"${source.name}" merged into the selected subcategory. Products reassigned.`);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Merge failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Subcategory governance"
        subtitle="Approve, rename, or merge supplier subcategories"
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
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No subcategories match this filter.</Text>
          ) : (
            list.map((row) => (
              <View key={row.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <View style={styles.cardMain}>
                  <Text style={[styles.name, { color: theme.text.primary }]}>{row.name}</Text>
                  <Text style={[styles.slug, { color: theme.text.tertiary }]}>{row.slug}</Text>
                  <Text style={[styles.muted, { color: theme.text.secondary }]}>
                    Category: {row.supplier_marketplace_categories?.name ?? '—'} · {row.supplier_marketplace_profiles?.business_name ?? '—'}
                  </Text>
                  <View style={styles.row}>
                    <Text style={[styles.statusBadge, { color: theme.text.tertiary }]}>{row.status}</Text>
                    <Text style={[styles.muted, { color: theme.text.tertiary }]}>{new Date(row.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  {row.status === 'pending' && (
                    <TouchableOpacity onPress={() => approveSubcategory(row)} style={[styles.iconBtn, { backgroundColor: '#D1FAE5' }]}>
                      <CheckCircle size={18} color="#065F46" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => openRename(row)} style={[styles.iconBtn, { backgroundColor: theme.background.secondary }]}>
                    <Pencil size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openMerge(row)} style={[styles.iconBtn, { backgroundColor: '#E0E7FF' }]}>
                    <Merge size={18} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={renameModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Rename subcategory</Text>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Display name"
              placeholderTextColor={theme.text.tertiary}
              value={renameName}
              onChangeText={onRenameNameChange}
            />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Slug * (lowercase, hyphens only)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="url-slug"
              placeholderTextColor={theme.text.tertiary}
              value={renameSlug}
              onChangeText={setRenameSlug}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => { setRenameModal(false); setEditingRow(null); }}>
                <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.accent.primary }]} onPress={saveRename} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={mergeModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Merge into another subcategory</Text>
            {editingRow && (
              <Text style={[styles.muted, { color: theme.text.secondary }]}>Merge "{editingRow.name}" into (products will be reassigned, this subcategory will be removed):</Text>
            )}
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {targetOptions.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.mergeOption, mergeTargetId === t.id && { backgroundColor: theme.accent.primary + '20' }]}
                  onPress={() => setMergeTargetId(t.id)}
                >
                  <Text style={[styles.mergeOptionText, { color: theme.text.primary }]}>{t.name}</Text>
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>{t.supplier_marketplace_profiles?.business_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {targetOptions.length === 0 && <Text style={[styles.muted, { color: theme.text.tertiary }]}>No other approved subcategories in this category.</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => { setMergeModal(false); setEditingRow(null); setMergeTargetId(null); }}>
                <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#4F46E5' }]} onPress={runMerge} disabled={saving || !mergeTargetId}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Merge</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardMain: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  slug: { fontSize: 13, marginTop: 2 },
  muted: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusBadge: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
  mergeOption: { padding: 12, borderRadius: 8, marginTop: 8 },
  mergeOptionText: { fontSize: 15, fontWeight: '500' },
});
