import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react-native';
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

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export default function AdminSupplierCategoriesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('supplier_marketplace_categories')
      .select('id, name, slug, description, display_order, is_active')
      .order('display_order', { ascending: true });
    if (!error && data) setList(data as CategoryRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setDisplayOrder('0');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditingId(row.id);
    setName(row.name);
    setSlug(row.slug);
    setDescription(row.description || '');
    setDisplayOrder(String(row.display_order ?? 0));
    setIsActive(row.is_active);
    setModalOpen(true);
  };

  const onNameChange = (t: string) => {
    setName(t);
    if (!editingId) setSlug(slugify(t));
  };

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedName || !trimmedSlug) {
      RNAlert.alert('Required', 'Name and slug are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        slug: trimmedSlug,
        description: description.trim() || null,
        display_order: parseInt(displayOrder, 10) || 0,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('supplier_marketplace_categories').update(payload).eq('id', editingId);
        if (error) throw error;
        setList((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c)));
        RNAlert.alert('Saved', 'Category updated.');
      } else {
        const { error } = await supabase.from('supplier_marketplace_categories').insert(payload);
        if (error) throw error;
        load();
        RNAlert.alert('Created', 'Category added.');
      }
      setModalOpen(false);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = (row: CategoryRow) => {
    RNAlert.alert('Delete category', `Delete "${row.name}"? Subcategories under it may be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('supplier_marketplace_categories').delete().eq('id', row.id);
          if (error) {
            RNAlert.alert('Error', error.message);
            return;
          }
          setList((prev) => prev.filter((c) => c.id !== row.id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier Categories"
        subtitle="Main marketplace categories"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={openNew}>
            <Plus size={24} color={theme.accent.primary} />
          </TouchableOpacity>
        }
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {list.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No categories. Add one to get started.</Text>
          ) : (
            list.map((row) => (
              <View key={row.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <View style={styles.cardMain}>
                  <Text style={[styles.name, { color: theme.text.primary }]}>{row.name}</Text>
                  <Text style={[styles.slug, { color: theme.text.tertiary }]}>{row.slug}</Text>
                  {row.description ? <Text style={[styles.desc, { color: theme.text.secondary }]} numberOfLines={1}>{row.description}</Text> : null}
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>Order: {row.display_order} · {row.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(row)} style={[styles.iconBtn, { backgroundColor: theme.background.secondary }]}>
                    <Pencil size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteCategory(row)} style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}>
                    <Trash2 size={18} color="#991B1B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{editingId ? 'Edit category' : 'New category'}</Text>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Name *</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Category name" placeholderTextColor={theme.text.tertiary} value={name} onChangeText={onNameChange} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Slug *</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="url-slug" placeholderTextColor={theme.text.tertiary} value={slug} onChangeText={setSlug} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Description</Text>
            <TextInput style={[styles.input, styles.inputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Optional description" placeholderTextColor={theme.text.tertiary} value={description} onChangeText={setDescription} multiline />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Display order</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="0" value={displayOrder} onChangeText={setDisplayOrder} keyboardType="number-pad" />
            <TouchableOpacity style={[styles.checkRow, { backgroundColor: theme.background.secondary }]} onPress={() => setIsActive(!isActive)}>
              <Text style={[styles.checkLabel, { color: theme.text.primary }]}>Active (visible in marketplace)</Text>
              <View style={[styles.checkbox, isActive && styles.checkboxOn]} />
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setModalOpen(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.accent.primary }]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Save</Text>}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', padding: 24 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardMain: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  slug: { fontSize: 13, marginTop: 2 },
  desc: { fontSize: 13, marginTop: 2 },
  muted: { fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  inputArea: { minHeight: 60, textAlignVertical: 'top' },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, marginTop: 10 },
  checkLabel: { fontSize: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#9CA3AF' },
  checkboxOn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
});
