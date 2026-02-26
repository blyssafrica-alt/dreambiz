import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Pencil, Star } from 'lucide-react-native';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';

type TierRow = {
  id: string;
  placement_type: string;
  label: string;
  description: string | null;
  benefits: string[];
  price: number;
  currency: string;
  duration_days: number;
  display_order: number;
  highlight_flag: boolean;
  is_active: boolean;
};

const PLACEMENT_TYPES = ['homepage_featured', 'feed_featured', 'category_featured'];

export default function AdminSupplierPlacementTiersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<TierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [placementType, setPlacementType] = useState('feed_featured');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [benefitsText, setBenefitsText] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [durationDays, setDurationDays] = useState('14');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [highlightFlag, setHighlightFlag] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('supplier_sponsored_placement_pricing')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data) {
      setList(
        data.map((r: any) => ({
          ...r,
          price: parseFloat(r.price),
          benefits: Array.isArray(r.benefits) ? r.benefits : (r.benefits ? (typeof r.benefits === 'string' ? JSON.parse(r.benefits) : r.benefits) : []),
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
    setPlacementType('feed_featured');
    setLabel('');
    setDescription('');
    setBenefitsText('');
    setPrice('');
    setCurrency('USD');
    setDurationDays('14');
    setDisplayOrder(String(list.length * 10));
    setHighlightFlag(false);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (row: TierRow) => {
    setEditingId(row.id);
    setPlacementType(row.placement_type);
    setLabel(row.label);
    setDescription(row.description || '');
    setBenefitsText((row.benefits || []).join('\n'));
    setPrice(String(row.price));
    setCurrency(row.currency || 'USD');
    setDurationDays(String(row.duration_days));
    setDisplayOrder(String(row.display_order ?? 0));
    setHighlightFlag(row.highlight_flag ?? false);
    setIsActive(row.is_active);
    setModalOpen(true);
  };

  const save = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      RNAlert.alert('Required', 'Tier name (label) is required.');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      RNAlert.alert('Invalid', 'Enter a valid price.');
      return;
    }
    const durationNum = parseInt(durationDays, 10);
    const orderNum = parseInt(displayOrder, 10);
    if (isNaN(durationNum) || durationNum < 1) {
      RNAlert.alert('Invalid', 'Duration must be at least 1 day.');
      return;
    }
    const benefits = benefitsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      const payload = {
        placement_type: editingId ? undefined : placementType,
        label: trimmedLabel,
        description: description.trim() || null,
        benefits,
        price: priceNum,
        currency: currency.trim() || 'USD',
        duration_days: durationNum,
        display_order: isNaN(orderNum) ? 0 : orderNum,
        highlight_flag: highlightFlag,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase
          .from('supplier_sponsored_placement_pricing')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        setList((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...payload, price: priceNum, benefits } : p)));
        RNAlert.alert('Saved', 'Tier updated. Suppliers will see the new content on the Promote page.');
      } else {
        const { error } = await supabase.from('supplier_sponsored_placement_pricing').insert(payload);
        if (error) throw error;
        load();
        RNAlert.alert('Created', 'Tier added.');
      }
      setModalOpen(false);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Placement tiers"
        subtitle="Control pricing and benefits shown on the Promote page"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={[styles.toolbar, { borderBottomColor: theme.border.light }]}>
        <Text style={[styles.toolbarText, { color: theme.text.secondary }]}>Tiers control what suppliers see. Only active tiers appear.</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent.primary }]} onPress={openNew}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add tier</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {list.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No placement tiers</Text>
              <Text style={[styles.emptySub, { color: theme.text.secondary }]}>Add tiers to show pricing on the supplier Promote page.</Text>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent.primary }]} onPress={openNew}>
                <Text style={styles.addBtnText}>Add first tier</Text>
              </TouchableOpacity>
            </View>
          ) : (
            list.map((row) => (
              <View key={row.id} style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{row.label}</Text>
                    <Text style={[styles.cardMeta, { color: theme.text.tertiary }]}>
                      {row.currency} {row.price} · {row.duration_days} days · Order {row.display_order}
                    </Text>
                  </View>
                  <View style={styles.cardBadges}>
                    {row.highlight_flag && (
                      <View style={[styles.badge, { backgroundColor: theme.surface.warning }]}>
                        <Star size={12} color={theme.text.inverse} />
                        <Text style={[styles.badgeText, { color: theme.text.inverse }]}>Recommended</Text>
                      </View>
                    )}
                    {!row.is_active && (
                      <View style={[styles.badge, { backgroundColor: theme.background.tertiary }]}>
                        <Text style={[styles.badgeText, { color: theme.text.secondary }]}>Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>
                {row.description ? <Text style={[styles.cardDesc, { color: theme.text.secondary }]} numberOfLines={2}>{row.description}</Text> : null}
                <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.background.secondary }]} onPress={() => openEdit(row)}>
                  <Pencil size={16} color={theme.accent.primary} />
                  <Text style={[styles.editBtnText, { color: theme.accent.primary }]}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{editingId ? 'Edit tier' : 'New placement tier'}</Text>
              <Text style={[styles.inputLabel, { color: theme.text.tertiary }]}>Name (label)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Homepage Featured"
                placeholderTextColor={theme.text.tertiary}
              />
              {!editingId && (
                <>
                  <Text style={[styles.inputLabel, { color: theme.text.tertiary }]}>Placement type</Text>
                  <View style={styles.chipRow}>
                    {PLACEMENT_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.chip, placementType === t && { backgroundColor: theme.accent.primary }]}
                        onPress={() => setPlacementType(t)}
                      >
                        <Text style={[styles.chipText, { color: placementType === t ? '#FFF' : theme.text.primary }]}>{t.replace(/_/g, ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <Text style={[styles.inputLabel, { color: theme.text.tertiary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Short description for the card"
                placeholderTextColor={theme.text.tertiary}
                multiline
              />
              <Text style={[styles.inputLabel, { color: theme.text.tertiary }]}>Benefits (one per line)</Text>
              <TextInput
                style={[styles.input, styles.inputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                value={benefitsText}
                onChangeText={setBenefitsText}
                placeholder="Featured on homepage\n30 days visibility"
                placeholderTextColor={theme.text.tertiary}
                multiline
              />
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.inputLabel, { color: theme.text.tertiary }]}>Price</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.inputLabel, { color: theme.text.tertiary }]}>Currency</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                    value={currency}
                    onChangeText={setCurrency}
                    placeholder="USD"
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={[styles.inputLabel, { color: theme.text.tertiary }]}>Duration (days)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                    value={durationDays}
                    onChangeText={setDurationDays}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.inputLabel, { color: theme.text.tertiary }]}>Display order</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                    value={displayOrder}
                    onChangeText={setDisplayOrder}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={[styles.switchRow, { borderTopColor: theme.border.light }]}>
                <Text style={[styles.switchLabel, { color: theme.text.primary }]}>Recommended (highlight on Promote)</Text>
                <Switch value={highlightFlag} onValueChange={setHighlightFlag} trackColor={{ false: theme.background.tertiary, true: theme.accent.primary }} thumbColor="#FFF" />
              </View>
              <View style={[styles.switchRow, { borderTopColor: theme.border.light }]}>
                <Text style={[styles.switchLabel, { color: theme.text.primary }]}>Active (show on Promote)</Text>
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: theme.background.tertiary, true: theme.accent.primary }} thumbColor="#FFF" />
              </View>
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
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  toolbarText: { fontSize: 13, flex: 1, marginRight: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md },
  addBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center' },
  emptyTitle: { ...typography.sectionTitle, marginBottom: spacing.xs },
  emptySub: { ...typography.caption, marginBottom: spacing.md, textAlign: 'center' },
  card: { padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.xs },
  cardTitle: { ...typography.cardTitle },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardBadges: { flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardDesc: { fontSize: 13, marginTop: spacing.xs },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, marginTop: spacing.sm },
  editBtnText: { fontWeight: '600', fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalBox: { borderRadius: radius.lg, padding: spacing.lg, maxWidth: 440 },
  modalTitle: { ...typography.sectionTitle, marginBottom: spacing.md },
  inputLabel: { fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, fontSize: 16 },
  inputArea: { minHeight: 64 },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full },
  chipText: { fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderTopWidth: 1, marginTop: spacing.xs },
  switchLabel: { fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  modalBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', minHeight: minTouchTarget, justifyContent: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
});
