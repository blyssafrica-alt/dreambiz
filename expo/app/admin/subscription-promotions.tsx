import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Pencil, Trash2, Tag, Gift, Percent, DollarSign, Users, Calendar, Search, ChevronRight, Building2, CheckSquare, Square } from 'lucide-react-native';
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
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  createPromotion,
  deletePromotion,
  getPromotion,
  getPromotionManualTargets,
  listPromotions,
  updatePromotion,
  getRedemptionCount,
} from '@/lib/promotion-engine';
import type { SubscriptionPromotion, CreatePromotionInput, PromotionType, PromotionTargetGroup } from '@/types/promotion';

const PROMO_TYPE_LABELS: Record<PromotionType, string> = {
  free_trial: 'Free trial',
  percentage_discount: 'Percentage discount',
  fixed_discount: 'Fixed amount discount',
};

const TARGET_GROUP_LABELS: Record<PromotionTargetGroup, string> = {
  manual: 'Manual selection',
  recent_signups: 'Recently signed up',
  inactive: 'Inactive suppliers',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function toDateInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

export default function AdminSubscriptionPromotionsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<SubscriptionPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PromotionType>('free_trial');
  const [targetGroup, setTargetGroup] = useState<PromotionTargetGroup>('manual');
  const [trialDays, setTrialDays] = useState('7');
  const [discountPercent, setDiscountPercent] = useState('50');
  const [discountAmount, setDiscountAmount] = useState('10');
  const [currency, setCurrency] = useState('USD');
  const [recentDaysDefinition, setRecentDaysDefinition] = useState('14');
  const [inactiveDaysDefinition, setInactiveDaysDefinition] = useState('30');
  const [durationInDays, setDurationInDays] = useState('30');
  const [startDate, setStartDate] = useState(() => toDateInput(new Date().toISOString()));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return toDateInput(d.toISOString());
  });
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [manualTargetIdsOverride, setManualTargetIdsOverride] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; business_name: string; city?: string; country?: string }[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [datePickerField, setDatePickerField] = useState<'start' | 'end' | null>(null);

  const load = async () => {
    if (!refreshing) setLoading(true);
    try {
      const promotions = await listPromotions(!showAll);
      setList(promotions);
    } catch (e: unknown) {
      RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to load promotions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from('supplier_marketplace_profiles')
      .select('id, business_name, city, country')
      .eq('status', 'approved')
      .order('business_name');
    setSuppliers((data ?? []) as { id: string; business_name: string; city?: string; country?: string }[]);
  };

  const openSupplierPicker = () => {
    setSupplierSearch('');
    loadSuppliers();
    setSupplierPickerOpen(true);
  };

  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredSuppliers.map((s) => s.id);
    setSelectedSupplierIds((prev) => [...new Set([...prev, ...ids])]);
  };

  const deselectAll = () => {
    setSelectedSupplierIds([]);
  };

  const filteredSuppliers = supplierSearch.trim()
    ? suppliers.filter(
        (s) =>
          s.business_name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
          (s.city?.toLowerCase().includes(supplierSearch.toLowerCase())) ||
          (s.country?.toLowerCase().includes(supplierSearch.toLowerCase()))
      )
    : suppliers;

  const onDateChange = (field: 'start' | 'end', _ev: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') setDatePickerField(null);
    if (selectedDate) {
      const str = toDateInput(selectedDate.toISOString());
      if (field === 'start') setStartDate(str);
      else setEndDate(str);
    }
  };

  const getTypeIcon = (t: PromotionType) => (t === 'free_trial' ? Gift : t === 'percentage_discount' ? Percent : DollarSign);
  const getTypeGradient = (t: PromotionType): [string, string] =>
    t === 'free_trial' ? ['#10B981', '#059669'] : t === 'percentage_discount' ? ['#0EA5E9', '#0284C7'] : ['#8B5CF6', '#7C3AED'];

  useEffect(() => {
    load();
  }, [showAll]);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setType('free_trial');
    setTargetGroup('manual');
    setTrialDays('7');
    setDiscountPercent('50');
    setDiscountAmount('10');
    setCurrency('USD');
    setRecentDaysDefinition('14');
    setInactiveDaysDefinition('30');
    setDurationInDays('30');
    setStartDate(toDateInput(new Date().toISOString()));
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    setEndDate(toDateInput(d.toISOString()));
    setMaxRedemptions('');
    setIsActive(true);
    setSelectedSupplierIds([]);
    setManualTargetIdsOverride('');
    setModalOpen(true);
  };

  const openEdit = async (promo: SubscriptionPromotion) => {
    setEditingId(promo.id);
    setName(promo.name);
    setDescription(promo.description ?? '');
    setType(promo.type);
    setTargetGroup(promo.targetGroup);
    setTrialDays(String(promo.trialDays ?? 7));
    setDiscountPercent(String(promo.discountPercent ?? 50));
    setDiscountAmount(String(promo.discountAmount ?? 10));
    setCurrency(promo.currency ?? 'USD');
    setRecentDaysDefinition(String(promo.recentDaysDefinition ?? 14));
    setInactiveDaysDefinition(String(promo.inactiveDaysDefinition ?? 30));
    setDurationInDays(String(promo.durationInDays));
    setStartDate(toDateInput(promo.startDate));
    setEndDate(toDateInput(promo.endDate));
    setMaxRedemptions(promo.maxRedemptions != null ? String(promo.maxRedemptions) : '');
    setIsActive(promo.isActive);
    setModalOpen(true);
    if (promo.targetGroup === 'manual') {
      try {
        const ids = await getPromotionManualTargets(promo.id);
        setSelectedSupplierIds(ids);
        setManualTargetIdsOverride('');
      } catch {
        setSelectedSupplierIds([]);
        setManualTargetIdsOverride('');
      }
    } else {
      setSelectedSupplierIds([]);
      setManualTargetIdsOverride('');
    }
  };

  const buildInput = (): CreatePromotionInput => {
    const overrideIds = manualTargetIdsOverride
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const manualIds = [...new Set([...selectedSupplierIds, ...overrideIds])];
    return {
      name: name.trim(),
      description: description.trim() || null,
      type,
      targetGroup,
      trialDays: type === 'free_trial' ? parseInt(trialDays, 10) || 7 : null,
      discountPercent: type === 'percentage_discount' ? parseFloat(discountPercent) || 0 : null,
      discountAmount: type === 'fixed_discount' ? parseFloat(discountAmount) || 0 : null,
      currency: currency.trim() || 'USD',
      recentDaysDefinition: parseInt(recentDaysDefinition, 10) || 14,
      inactiveDaysDefinition: parseInt(inactiveDaysDefinition, 10) || 30,
      durationInDays: parseInt(durationInDays, 10) || 30,
      startDate: `${startDate}T00:00:00.000Z`,
      endDate: `${endDate}T23:59:59.999Z`,
      maxRedemptions: maxRedemptions.trim() ? parseInt(maxRedemptions, 10) : null,
      isActive,
      manualTargetIds: targetGroup === 'manual' ? manualIds : undefined,
    };
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      RNAlert.alert('Required', 'Promotion name is required.');
      return;
    }
    if (!startDate || !endDate) {
      RNAlert.alert('Required', 'Start and end dates are required.');
      return;
    }
    if (type === 'free_trial' && (!trialDays || parseInt(trialDays, 10) < 1)) {
      RNAlert.alert('Invalid', 'Trial days must be at least 1.');
      return;
    }
    if (type === 'percentage_discount' && (parseFloat(discountPercent) < 0 || parseFloat(discountPercent) > 100)) {
      RNAlert.alert('Invalid', 'Discount percent must be between 0 and 100.');
      return;
    }
    if (type === 'fixed_discount' && parseFloat(discountAmount) < 0) {
      RNAlert.alert('Invalid', 'Discount amount must be >= 0.');
      return;
    }
    if (targetGroup === 'manual') {
      const overrideIds = manualTargetIdsOverride.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const total = selectedSupplierIds.length + overrideIds.length;
      if (total === 0) {
        RNAlert.alert('Required', 'For manual targeting, select at least one supplier or add IDs.');
        return;
      }
    }

    setSaving(true);
    try {
      const input = buildInput();
      if (editingId) {
        await updatePromotion(editingId, input);
        RNAlert.alert('Saved', 'Promotion updated.');
      } else {
        await createPromotion(input);
        RNAlert.alert('Created', 'Promotion added.');
      }
      setModalOpen(false);
      load();
    } catch (e: unknown) {
      RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deletePromo = async (promo: SubscriptionPromotion) => {
    let count = 0;
    try {
      count = await getRedemptionCount(promo.id);
    } catch {}
    RNAlert.alert(
      'Delete promotion',
      `Permanently delete "${promo.name}"? It will be removed from the system.${count > 0 ? ` It has ${count} redemption(s); existing subscriptions will keep their discount/trial but will no longer reference this promotion.` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePromotion(promo.id);
              RNAlert.alert('Deleted', 'Promotion has been permanently removed.');
              load();
            } catch (e: unknown) {
              RNAlert.alert('Error', (e as Error)?.message ?? 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Subscription Promotions"
        subtitle="Trials, discounts on supplier subscriptions"
        showLogo={false}
        icon={Tag}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={openNew}>
            <Plus size={24} color={theme.accent.primary} />
          </TouchableOpacity>
        }
      />
      <View style={[styles.filterRow, { backgroundColor: theme.background.primary }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterChip, !showAll && styles.filterChipActive, !showAll && { backgroundColor: theme.accent.primary }]}
            onPress={() => setShowAll(false)}
          >
            <Text style={[styles.filterChipText, { color: !showAll ? '#FFF' : theme.text.secondary }]}>Active only</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, showAll && styles.filterChipActive, showAll && { backgroundColor: theme.accent.primary }]}
            onPress={() => setShowAll(true)}
          >
            <Text style={[styles.filterChipText, { color: showAll ? '#FFF' : theme.text.secondary }]}>All</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} />}
        >
          {list.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.background.card }]}>
              <LinearGradient colors={['#10B98122', '#10B98108']} style={styles.emptyIconWrap}>
                <Tag size={56} color="#10B981" strokeWidth={1.5} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No promotions yet</Text>
              <Text style={[styles.emptySub, { color: theme.text.tertiary }]}>
                Create trials, percentage or fixed discounts to boost supplier signups.
              </Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.accent.primary }]} onPress={openNew} activeOpacity={0.85}>
                <Plus size={20} color="#FFF" />
                <Text style={styles.emptyBtnText}>Create promotion</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={[styles.statPill, { backgroundColor: theme.accent.primary + '18' }]}>
                  <Text style={[styles.statPillValue, { color: theme.accent.primary }]}>{list.length}</Text>
                  <Text style={[styles.statPillLabel, { color: theme.text.secondary }]}>{showAll ? 'Total' : 'Active'}</Text>
                </View>
              </View>
              {list.map((promo) => {
                const TypeIcon = getTypeIcon(promo.type);
                const gradient = getTypeGradient(promo.type);
                return (
                  <View key={promo.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                    <View style={styles.cardLeft}>
                      <LinearGradient colors={gradient} style={styles.cardIconWrap}>
                        <TypeIcon size={22} color="#FFF" strokeWidth={2.5} />
                      </LinearGradient>
                      <View style={styles.cardMain}>
                        <View style={styles.cardHeader}>
                          <Text style={[styles.name, { color: theme.text.primary }]}>{promo.name}</Text>
                          <View style={[styles.badge, { backgroundColor: promo.isActive ? '#D1FAE5' : '#F3F4F6' }]}>
                            <Text style={[styles.badgeText, { color: promo.isActive ? '#065F46' : '#6B7280' }]}>
                              {promo.isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.typeLabel, { color: theme.text.secondary }]}>
                          {PROMO_TYPE_LABELS[promo.type]}
                          {promo.type === 'free_trial' && promo.trialDays != null && ` · ${promo.trialDays} days`}
                          {promo.type === 'percentage_discount' && promo.discountPercent != null && ` · ${promo.discountPercent}% off`}
                          {promo.type === 'fixed_discount' && promo.discountAmount != null && ` · ${promo.currency} ${promo.discountAmount} off`}
                        </Text>
                        <View style={styles.cardMeta}>
                          <Users size={12} color={theme.text.tertiary} />
                          <Text style={[styles.targetLabel, { color: theme.text.tertiary }]}>{TARGET_GROUP_LABELS[promo.targetGroup]}</Text>
                        </View>
                        <View style={styles.cardMeta}>
                          <Calendar size={12} color={theme.text.tertiary} />
                          <Text style={[styles.dateLabel, { color: theme.text.tertiary }]}>
                            {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => openEdit(promo)} style={[styles.iconBtn, { backgroundColor: theme.accent.primary + '18' }]}>
                        <Pencil size={18} color={theme.accent.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deletePromo(promo)} style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}>
                        <Trash2 size={18} color="#991B1B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
              <LinearGradient colors={['#10B98118', '#05966908']} style={styles.formHeaderGrad}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{editingId ? 'Edit promotion' : 'New promotion'}</Text>
                <Text style={[styles.modalSubtitle, { color: theme.text.tertiary }]}>Configure trials, discounts and targeting</Text>
              </LinearGradient>

              {/* Section: Basic info */}
              <View style={[styles.formSection, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Basic info</Text>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                  placeholder="e.g. Summer trial"
                  placeholderTextColor={theme.text.tertiary}
                  value={name}
                  onChangeText={setName}
                />
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.inputArea, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                  placeholder="Optional"
                  placeholderTextColor={theme.text.tertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              {/* Section: Promotion type */}
              <View style={[styles.formSection, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Promotion type</Text>
                <View style={styles.typeCards}>
                  {(['free_trial', 'percentage_discount', 'fixed_discount'] as const).map((t) => {
                    const Icon = getTypeIcon(t);
                    const grad = getTypeGradient(t);
                    const sel = type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeCard, sel && styles.typeCardSelected]}
                        onPress={() => setType(t)}
                      >
                        <LinearGradient colors={sel ? grad : [theme.background.card, theme.background.card]} style={styles.typeCardInner}>
                          <Icon size={22} color={sel ? '#FFF' : theme.text.tertiary} strokeWidth={2.5} />
                          <Text style={[styles.typeCardText, { color: sel ? '#FFF' : theme.text.secondary }]}>{PROMO_TYPE_LABELS[t]}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {type === 'free_trial' && (
                  <>
                    <Text style={[styles.label, { color: theme.text.tertiary }]}>Trial days *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                      placeholder="7"
                      placeholderTextColor={theme.text.tertiary}
                      value={trialDays}
                      onChangeText={setTrialDays}
                      keyboardType="number-pad"
                    />
                  </>
                )}
                {type === 'percentage_discount' && (
                  <>
                    <Text style={[styles.label, { color: theme.text.tertiary }]}>Discount % *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                      placeholder="50"
                      placeholderTextColor={theme.text.tertiary}
                      value={discountPercent}
                      onChangeText={setDiscountPercent}
                      keyboardType="decimal-pad"
                    />
                  </>
                )}
                {type === 'fixed_discount' && (
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <Text style={[styles.label, { color: theme.text.tertiary }]}>Amount *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                        placeholder="10"
                        placeholderTextColor={theme.text.tertiary}
                        value={discountAmount}
                        onChangeText={setDiscountAmount}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.half}>
                      <Text style={[styles.label, { color: theme.text.tertiary }]}>Currency</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                        placeholder="USD"
                        placeholderTextColor={theme.text.tertiary}
                        value={currency}
                        onChangeText={setCurrency}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Section: Target group */}
              <View style={[styles.formSection, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Target audience</Text>
                <View style={styles.targetRow}>
                  {(['manual', 'recent_signups', 'inactive'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.targetChip, targetGroup === t && { backgroundColor: theme.accent.primary }]}
                      onPress={() => setTargetGroup(t)}
                    >
                      <Text style={[styles.targetChipText, { color: targetGroup === t ? '#FFF' : theme.text.secondary }]}>{TARGET_GROUP_LABELS[t]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {targetGroup === 'recent_signups' && (
                  <>
                    <Text style={[styles.label, { color: theme.text.tertiary }]}>Recent = signed up within (days)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                      placeholder="14"
                      placeholderTextColor={theme.text.tertiary}
                      value={recentDaysDefinition}
                      onChangeText={setRecentDaysDefinition}
                      keyboardType="number-pad"
                    />
                  </>
                )}
                {targetGroup === 'inactive' && (
                  <>
                    <Text style={[styles.label, { color: theme.text.tertiary }]}>Inactive = expired for (days)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                      placeholder="30"
                      placeholderTextColor={theme.text.tertiary}
                      value={inactiveDaysDefinition}
                      onChangeText={setInactiveDaysDefinition}
                      keyboardType="number-pad"
                    />
                  </>
                )}
                {targetGroup === 'manual' && (
                  <>
                    <TouchableOpacity style={[styles.supplierPickerBtn, { backgroundColor: theme.accent.primary + '18' }]} onPress={openSupplierPicker}>
                      <Building2 size={20} color={theme.accent.primary} />
                      <Text style={[styles.supplierPickerText, { color: theme.accent.primary }]}>
                        {selectedSupplierIds.length > 0
                          ? `${selectedSupplierIds.length} supplier${selectedSupplierIds.length === 1 ? '' : 's'} selected`
                          : 'Select suppliers'}
                      </Text>
                      <ChevronRight size={18} color={theme.accent.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.labelSmall, { color: theme.text.tertiary }]}>Or paste UUIDs (one per line or comma-separated)</Text>
                    <TextInput
                      style={[styles.input, styles.inputAreaSmall, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                      placeholder="Optional: paste extra profile IDs"
                      placeholderTextColor={theme.text.tertiary}
                      value={manualTargetIdsOverride}
                      onChangeText={setManualTargetIdsOverride}
                      multiline
                    />
                  </>
                )}
              </View>

              {/* Section: Validity & limits */}
              <View style={[styles.formSection, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Validity & limits</Text>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Duration (days) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                  placeholder="30"
                  placeholderTextColor={theme.text.tertiary}
                  value={durationInDays}
                  onChangeText={setDurationInDays}
                  keyboardType="number-pad"
                />

                <Text style={[styles.label, { color: theme.text.tertiary }]}>Start date *</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={[styles.dateBtn, { backgroundColor: theme.background.card }]}
                    onPress={() => setDatePickerField('start')}
                  >
                    <Calendar size={18} color={theme.accent.primary} />
                    <Text style={[styles.dateBtnText, { color: theme.text.primary }]}>{startDate || 'Pick date'}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.dateInput, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>

                <Text style={[styles.label, { color: theme.text.tertiary }]}>End date *</Text>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={[styles.dateBtn, { backgroundColor: theme.background.card }]}
                    onPress={() => setDatePickerField('end')}
                  >
                    <Calendar size={18} color={theme.accent.primary} />
                    <Text style={[styles.dateBtnText, { color: theme.text.primary }]}>{endDate || 'Pick date'}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.dateInput, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>

                {datePickerField && Platform.OS !== 'web' && (
                  <DateTimePicker
                    value={datePickerField === 'start' ? new Date(startDate || Date.now()) : new Date(endDate || Date.now())}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, d) => onDateChange(datePickerField, _, d)}
                  />
                )}
                {datePickerField && Platform.OS === 'ios' && (
                  <TouchableOpacity style={[styles.dateDoneBtn, { backgroundColor: theme.accent.primary }]} onPress={() => setDatePickerField(null)}>
                    <Text style={styles.dateDoneText}>Done</Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.label, { color: theme.text.tertiary }]}>Max redemptions</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.card, color: theme.text.primary }]}
                  placeholder="Unlimited"
                  placeholderTextColor={theme.text.tertiary}
                  value={maxRedemptions}
                  onChangeText={setMaxRedemptions}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.switchRow, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.switchLabel, { color: theme.text.primary }]}>Active</Text>
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#9CA3AF', true: theme.accent.primary }} thumbColor="#FFF" />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setModalOpen(false)}>
                  <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.accent.primary }]} onPress={save} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Supplier picker modal */}
      <Modal visible={supplierPickerOpen} transparent animationType="slide">
        <View style={styles.pickerBackdrop}>
          <View style={[styles.pickerBox, { backgroundColor: theme.background.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: theme.text.primary }]}>Select suppliers</Text>
              <TouchableOpacity onPress={() => setSupplierPickerOpen(false)}>
                <Text style={[styles.pickerDoneText, { color: theme.accent.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.pickerSearchWrap, { backgroundColor: theme.background.secondary }]}>
              <Search size={20} color={theme.text.tertiary} />
              <TextInput
                style={[styles.pickerSearch, { color: theme.text.primary }]}
                placeholder="Search by name, city, country"
                placeholderTextColor={theme.text.tertiary}
                value={supplierSearch}
                onChangeText={setSupplierSearch}
              />
            </View>
            <View style={styles.pickerSelectAllRow}>
              <TouchableOpacity style={[styles.pickerSelectAllBtn, { backgroundColor: theme.accent.primary + '18' }]} onPress={selectAllFiltered} disabled={filteredSuppliers.length === 0}>
                <CheckSquare size={18} color={theme.accent.primary} strokeWidth={2} />
                <Text style={[styles.pickerSelectAllText, { color: theme.accent.primary }]}>Select all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pickerSelectAllBtn, { backgroundColor: theme.background.secondary }]} onPress={deselectAll} disabled={selectedSupplierIds.length === 0}>
                <Square size={18} color={theme.text.tertiary} strokeWidth={2} />
                <Text style={[styles.pickerSelectAllText, { color: theme.text.secondary }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList} contentContainerStyle={filteredSuppliers.length === 0 ? styles.pickerListContentEmpty : undefined} keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator>
              {filteredSuppliers.map((s) => {
                const sel = selectedSupplierIds.includes(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pickerRow, sel && { backgroundColor: theme.accent.primary + '12' }]}
                    onPress={() => toggleSupplier(s.id)}
                  >
                    <View style={[styles.pickerCheck, sel && { backgroundColor: theme.accent.primary, borderColor: theme.accent.primary }]}>
                      {sel && <Text style={styles.pickerCheckText}>✓</Text>}
                    </View>
                    <View style={styles.pickerRowContent}>
                      <Text style={[styles.pickerRowName, { color: theme.text.primary }]}>{s.business_name}</Text>
                      <Text style={[styles.pickerRowMeta, { color: theme.text.tertiary }]}>
                        {[s.city, s.country].filter(Boolean).join(', ') || '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {filteredSuppliers.length === 0 && (
                <Text style={[styles.pickerEmpty, { color: theme.text.tertiary }]}>No suppliers found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
  filterContent: { gap: 10 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
  filterChipActive: {},
  filterChipText: { fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  statPill: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, minWidth: 100 },
  statPillValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statPillLabel: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 40, borderRadius: 24, marginTop: 20 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  emptyBtn: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLeft: { flexDirection: 'row', flex: 1, gap: 14 },
  cardIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardMain: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  name: { fontSize: 17, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  typeLabel: { fontSize: 14, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  targetLabel: { fontSize: 13 },
  dateLabel: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalScroll: { width: '100%', maxHeight: '90%' },
  modalScrollContent: { paddingBottom: 32 },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  formHeaderGrad: { padding: 20, borderRadius: 16, marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  modalSubtitle: { fontSize: 14, marginTop: 6 },
  formSection: { borderRadius: 16, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 4, marginTop: 12 },
  labelSmall: { fontSize: 11, marginTop: 8, marginBottom: 4 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  inputArea: { minHeight: 60, textAlignVertical: 'top' },
  inputAreaSmall: { minHeight: 44, textAlignVertical: 'top', fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  typeChipText: { fontSize: 14, fontWeight: '600' },
  typeCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { flex: 1, minWidth: '30%' },
  typeCardSelected: { overflow: 'hidden', borderRadius: 14 },
  typeCardInner: { padding: 14, borderRadius: 14, alignItems: 'center', gap: 8 },
  typeCardText: { fontSize: 13, fontWeight: '600' },
  targetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  targetChipText: { fontSize: 13, fontWeight: '600' },
  supplierPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginTop: 8 },
  supplierPickerText: { fontSize: 15, fontWeight: '600', flex: 1 },
  dateRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 4 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, flex: 1 },
  dateBtnText: { fontSize: 15, fontWeight: '500' },
  dateInput: { flex: 1, padding: 12, borderRadius: 10, fontSize: 14 },
  dateDoneBtn: { marginTop: 8, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  dateDoneText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  modalBtnPrimary: {},
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, marginTop: 12 },
  switchLabel: { fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerBox: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', paddingBottom: 24 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  pickerDoneText: { fontSize: 16, fontWeight: '600' },
  pickerSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  pickerSearch: { flex: 1, fontSize: 15 },
  pickerSelectAllRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  pickerSelectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  pickerSelectAllText: { fontSize: 14, fontWeight: '600' },
  pickerList: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  pickerListContentEmpty: { flexGrow: 1 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 6 },
  pickerCheck: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  pickerCheckText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  pickerRowContent: { flex: 1 },
  pickerRowName: { fontSize: 15, fontWeight: '600' },
  pickerRowMeta: { fontSize: 13, marginTop: 2 },
  pickerEmpty: { textAlign: 'center', padding: 24, fontSize: 15 },
});
