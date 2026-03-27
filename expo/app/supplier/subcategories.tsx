import { useRouter } from 'expo-router';
import { ArrowLeft, Layers, Plus, Trash2 } from 'lucide-react-native';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type CategoryRow = { id: string; name: string };
type SubcategoryRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  supplier_marketplace_categories: { name: string } | null;
};

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

export default function SupplierSubcategoriesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: profile } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      setProfileId(profile?.id ?? null);
      if (!profile?.id) {
        setLoading(false);
        return;
      }
      const [catRes, subRes] = await Promise.all([
        supabase.from('supplier_marketplace_categories').select('id, name').eq('is_active', true).order('display_order'),
        supabase
          .from('supplier_marketplace_subcategories')
          .select('id, category_id, name, slug, status, created_at, supplier_marketplace_categories(name)')
          .eq('supplier_profile_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);
      if (catRes.data) setCategories(catRes.data as CategoryRow[]);
      if (subRes.data) setSubcategories(subRes.data as SubcategoryRow[]);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const openAdd = () => {
    setNewName('');
    setNewCategoryId(categories[0]?.id ?? null);
    setModalOpen(true);
  };

  const createSubcategory = async () => {
    const name = newName.trim();
    if (!name) {
      RNAlert.alert('Required', 'Enter a subcategory name.');
      return;
    }
    if (!newCategoryId || !profileId) {
      RNAlert.alert('Required', 'Select a category.');
      return;
    }
    const slug = slugify(name);
    if (!slug) {
      RNAlert.alert('Invalid', 'Name must contain at least one letter or number.');
      return;
    }
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase
        .from('supplier_marketplace_subcategories')
        .insert({
          supplier_profile_id: profileId,
          category_id: newCategoryId,
          name,
          slug,
          status: 'pending',
        })
        .select('id, category_id, name, slug, status, created_at')
        .single();
      if (error) throw error;
      const cat = categories.find((c) => c.id === newCategoryId);
      if (inserted) {
        setSubcategories((prev) => [
          {
            ...(inserted as SubcategoryRow),
            supplier_marketplace_categories: cat ? { name: cat.name } : null,
          },
          ...prev,
        ]);
      }
      setModalOpen(false);
      RNAlert.alert('Created', 'Subcategory submitted. It will appear after admin approval.');
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not create subcategory.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSubcategory = (row: SubcategoryRow) => {
    RNAlert.alert('Delete subcategory', `Remove "${row.name}"? Products using it will have their category cleared.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!profileId) return;
          const { error } = await supabase
            .from('supplier_marketplace_subcategories')
            .delete()
            .eq('id', row.id)
            .eq('supplier_profile_id', profileId);
          if (error) {
            RNAlert.alert('Error', error.message);
            return;
          }
          setSubcategories((prev) => prev.filter((s) => s.id !== row.id));
        },
      },
    ]);
  };

  if (!profileId && !loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Supplier profile not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Subcategories"
        subtitle="Create subcategories under main categories (pending approval)"
        icon={Layers}
        iconGradient={['#8B5CF6', '#7C3AED']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={openAdd} disabled={categories.length === 0}>
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
          {categories.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No main categories available yet. Ask admin to add categories.</Text>
          ) : subcategories.length === 0 ? (
            <View style={[styles.card, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.body, { color: theme.text.secondary }]}>You have no subcategories yet. Tap + to create one under a main category. New subcategories need admin approval before they appear in the marketplace.</Text>
              <TouchableOpacity style={[styles.addFirstBtn, { backgroundColor: theme.accent.primary }]} onPress={openAdd}>
                <Plus size={18} color="#FFF" />
                <Text style={styles.addFirstBtnText}>Add subcategory</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={[styles.addRow, { backgroundColor: theme.background.card }]} onPress={openAdd}>
                <Plus size={20} color={theme.accent.primary} />
                <Text style={[styles.addRowText, { color: theme.accent.primary }]}>Add subcategory</Text>
              </TouchableOpacity>
              {subcategories.map((s) => (
                <View key={s.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                  <View style={styles.cardMain}>
                    <Text style={[styles.name, { color: theme.text.primary }]}>{s.name}</Text>
                    <Text style={[styles.slug, { color: theme.text.tertiary }]}>{s.slug}</Text>
                    <Text style={[styles.muted, { color: theme.text.secondary }]}>
                      Under: {s.supplier_marketplace_categories?.name ?? '—'} · {s.status === 'approved' ? 'Approved' : 'Pending approval'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => deleteSubcategory(s)}
                  >
                    <Trash2 size={18} color="#991B1B" />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>New subcategory</Text>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Main category *</Text>
            <View style={styles.pickerRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerChip, newCategoryId === c.id && { backgroundColor: theme.accent.primary }]}
                  onPress={() => setNewCategoryId(c.id)}
                >
                  <Text style={[styles.pickerChipText, { color: newCategoryId === c.id ? '#FFF' : theme.text.primary }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="e.g. Organic vegetables"
              placeholderTextColor={theme.text.tertiary}
              value={newName}
              onChangeText={setNewName}
            />
            <Text style={[styles.hint, { color: theme.text.tertiary }]}>Slug: {slugify(newName || '') || '—'}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setModalOpen(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.accent.primary }]} onPress={createSubcategory} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Create</Text>}
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
  muted: { fontSize: 12, marginTop: 4 },
  body: { fontSize: 14, lineHeight: 20 },
  addFirstBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginTop: 16 },
  addFirstBtnText: { color: '#FFF', fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 12, marginBottom: 12 },
  addRowText: { fontSize: 15, fontWeight: '600' },
  iconBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  hint: { fontSize: 12, marginTop: 4 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pickerChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pickerChipText: { fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
});
