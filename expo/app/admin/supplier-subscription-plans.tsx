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

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  product_limit: number;
  ads_allowed: boolean;
  featured_allowed: boolean;
  display_order: number;
  is_active: boolean;
};

export default function AdminSupplierSubscriptionPlansScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [durationDays, setDurationDays] = useState('30');
  const [productLimit, setProductLimit] = useState('10');
  const [adsAllowed, setAdsAllowed] = useState(false);
  const [featuredAllowed, setFeaturedAllowed] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('supplier_subscription_plans')
      .select('id, name, description, price, currency, duration_days, product_limit, ads_allowed, featured_allowed, display_order, is_active')
      .order('display_order', { ascending: true });
    if (!error && data) {
      setList(
        data.map((r: any) => ({
          ...r,
          price: parseFloat(r.price),
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setCurrency('USD');
    setDurationDays('30');
    setProductLimit('10');
    setAdsAllowed(false);
    setFeaturedAllowed(false);
    setDisplayOrder('0');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (row: PlanRow) => {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description || '');
    setPrice(String(row.price));
    setCurrency(row.currency || 'USD');
    setDurationDays(String(row.duration_days));
    setProductLimit(String(row.product_limit));
    setAdsAllowed(row.ads_allowed ?? false);
    setFeaturedAllowed(row.featured_allowed ?? false);
    setDisplayOrder(String(row.display_order ?? 0));
    setIsActive(row.is_active);
    setModalOpen(true);
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      RNAlert.alert('Required', 'Plan name is required.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      RNAlert.alert('Invalid', 'Enter a valid price.');
      return;
    }
    const durationNum = parseInt(durationDays, 10);
    const productNum = parseInt(productLimit, 10);
    if (isNaN(durationNum) || durationNum < 1 || isNaN(productNum) || productNum < 0) {
      RNAlert.alert('Invalid', 'Duration and product limit must be valid numbers.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        description: description.trim() || null,
        price: priceNum,
        currency: currency.trim() || 'USD',
        duration_days: durationNum,
        product_limit: productNum,
        ads_allowed: adsAllowed,
        featured_allowed: featuredAllowed,
        display_order: parseInt(displayOrder, 10) || 0,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('supplier_subscription_plans').update(payload).eq('id', editingId);
        if (error) throw error;
        setList((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...payload, price: priceNum } : p)));
        RNAlert.alert('Saved', 'Plan updated.');
      } else {
        const { error } = await supabase.from('supplier_subscription_plans').insert(payload);
        if (error) throw error;
        load();
        RNAlert.alert('Created', 'Plan added.');
      }
      setModalOpen(false);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (row: PlanRow) => {
    const { count } = await supabase.from('supplier_subscriptions').select('*', { count: 'exact', head: true }).eq('plan_id', row.id);
    if (count != null && count > 0) {
      RNAlert.alert('Cannot delete', `This plan is used by ${count} subscription(s). Deactivate it instead.`);
      return;
    }
    RNAlert.alert('Delete plan', `Delete "${row.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('supplier_subscription_plans').delete().eq('id', row.id);
          if (error) {
            RNAlert.alert('Error', error.message);
            return;
          }
          setList((prev) => prev.filter((p) => p.id !== row.id));
        },
      },
    ]);
  };

  const toggle = (key: 'adsAllowed' | 'featuredAllowed' | 'isActive') => {
    if (key === 'adsAllowed') setAdsAllowed((v) => !v);
    if (key === 'featuredAllowed') setFeaturedAllowed((v) => !v);
    if (key === 'isActive') setIsActive((v) => !v);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier Plans"
        subtitle="Subscription plans"
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
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No plans. Add one to get started.</Text>
          ) : (
            list.map((row) => (
              <View key={row.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <View style={styles.cardMain}>
                  <Text style={[styles.name, { color: theme.text.primary }]}>{row.name}</Text>
                  <Text style={[styles.detail, { color: theme.text.secondary }]}>
                    {row.currency} {row.price} · {row.duration_days} days · {row.product_limit} products
                  </Text>
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>
                    Order: {row.display_order} · {row.is_active ? 'Active' : 'Inactive'}
                    {row.ads_allowed ? ' · Ads' : ''}
                    {row.featured_allowed ? ' · Featured' : ''}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(row)} style={[styles.iconBtn, { backgroundColor: theme.background.secondary }]}>
                    <Pencil size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deletePlan(row)} style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}>
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
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{editingId ? 'Edit plan' : 'New plan'}</Text>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Name *</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Plan name" placeholderTextColor={theme.text.tertiary} value={name} onChangeText={setName} />
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Description</Text>
              <TextInput style={[styles.input, styles.inputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Optional" placeholderTextColor={theme.text.tertiary} value={description} onChangeText={setDescription} multiline />
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Price *</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="0" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Currency</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="USD" value={currency} onChangeText={setCurrency} />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Duration (days) *</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="30" value={durationDays} onChangeText={setDurationDays} keyboardType="number-pad" />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Product limit</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="10" value={productLimit} onChangeText={setProductLimit} keyboardType="number-pad" />
                </View>
              </View>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Display order</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="0" value={displayOrder} onChangeText={setDisplayOrder} keyboardType="number-pad" />
              <TouchableOpacity style={[styles.checkRow, { backgroundColor: theme.background.secondary }]} onPress={() => toggle('adsAllowed')}>
                <Text style={[styles.checkLabel, { color: theme.text.primary }]}>Ads allowed</Text>
                <View style={[styles.checkbox, adsAllowed && styles.checkboxOn]} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.checkRow, { backgroundColor: theme.background.secondary }]} onPress={() => toggle('featuredAllowed')}>
                <Text style={[styles.checkLabel, { color: theme.text.primary }]}>Featured allowed</Text>
                <View style={[styles.checkbox, featuredAllowed && styles.checkboxOn]} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.checkRow, { backgroundColor: theme.background.secondary }]} onPress={() => toggle('isActive')}>
                <Text style={[styles.checkLabel, { color: theme.text.primary }]}>Active (visible to suppliers)</Text>
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
          </ScrollView>
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
  detail: { fontSize: 14, marginTop: 2 },
  muted: { fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalScroll: { width: '100%', maxHeight: '85%' },
  modalScrollContent: { paddingBottom: 24 },
  modalBox: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  inputArea: { minHeight: 50, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, marginTop: 10 },
  checkLabel: { fontSize: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#9CA3AF' },
  checkboxOn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
});
