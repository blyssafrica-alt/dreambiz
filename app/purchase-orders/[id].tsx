import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShoppingCart, Package, Check } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  useBuyerPurchaseOrders,
  useAddPOToInventory,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type AddToInventoryPaymentMethod,
} from '@/hooks/usePurchaseOrders';

const PAYMENT_OPTIONS: { value: AddToInventoryPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'credit', label: 'Credit (owe supplier)' },
];

function ItemRow({
  item,
  selected,
  onToggle,
  sellingPrice,
  onSellingPriceChange,
  theme,
  currency,
}: {
  item: PurchaseOrderItem;
  selected: boolean;
  onToggle: () => void;
  sellingPrice: string;
  onSellingPriceChange: (v: string) => void;
  theme: any;
  currency: string;
}) {
  const name = item.supplier_marketplace_products?.name ?? 'Product';
  const lineTotal = item.quantity * item.unit_price;
  return (
    <View style={[styles.itemRow, { backgroundColor: theme.background.tertiary }]}>
      <TouchableOpacity onPress={onToggle} style={styles.checkboxRow}>
        <View style={[styles.checkbox, selected && { backgroundColor: theme.accent.primary }]}>
          {selected && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: theme.text.primary }]} numberOfLines={2}>{name}</Text>
          <Text style={[styles.itemMeta, { color: theme.text.tertiary }]}>
            {item.quantity} × {currency} {item.unit_price.toLocaleString()} = {currency} {lineTotal.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.sellingPriceRow}>
        <Text style={[styles.sellingPriceLabel, { color: theme.text.secondary }]}>Selling price (optional)</Text>
        <TextInput
          style={[styles.sellingPriceInput, { backgroundColor: theme.background.card, color: theme.text.primary }]}
          value={sellingPrice}
          onChangeText={onSellingPriceChange}
          placeholder={`${currency} 0`}
          placeholderTextColor={theme.text.tertiary}
          keyboardType="decimal-pad"
        />
      </View>
    </View>
  );
}

export default function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { business, refreshData } = useBusiness();
  const { data: orders = [], isLoading } = useBuyerPurchaseOrders(user?.id);
  const addToInventory = useAddPOToInventory(user?.id);

  const po = orders.find((o) => o.id === id) ?? null;

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<AddToInventoryPaymentMethod>('cash');
  const [sellingPrices, setSellingPrices] = useState<Record<string, string>>({});

  const items = (po?.supplier_purchase_order_items ?? []) as PurchaseOrderItem[];
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const toggleAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id)));
  }, [allSelected, items]);
  const toggleItem = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);
  const setSellingPrice = useCallback((itemId: string, value: string) => {
    setSellingPrices((prev) => ({ ...prev, [itemId]: value }));
  }, []);

  const selectedTotal = items
    .filter((i) => selectedIds.has(i.id))
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const handleAddToInventory = useCallback(async () => {
    if (!business?.id || !po?.id || selectedIds.size === 0) return;
    const itemIds = Array.from(selectedIds);
    const prices: Record<string, number> = {};
    itemIds.forEach((itemId) => {
      const raw = sellingPrices[itemId]?.trim();
      const num = raw ? parseFloat(raw) : undefined;
      if (num != null && !Number.isNaN(num) && num >= 0) prices[itemId] = num;
    });
    // RPC expects p_selling_prices keyed by supplier product_id (item.product_id), not item id
    const pSellingPrices: Record<string, number> = {};
    items.forEach((i) => {
      if (selectedIds.has(i.id)) {
        const raw = sellingPrices[i.id]?.trim();
        const num = raw ? parseFloat(raw) : undefined;
        if (num != null && !Number.isNaN(num) && num >= 0) pSellingPrices[i.product_id] = num;
      }
    });
    try {
      await addToInventory.mutateAsync({
        businessId: business.id,
        purchaseOrderId: po.id,
        itemIds,
        paymentMethod,
        sellingPrices: Object.keys(pSellingPrices).length > 0 ? pSellingPrices : undefined,
      });
      await refreshData();
      setModalVisible(false);
      setSelectedIds(new Set());
      setSellingPrices({});
      Alert.alert('Done', 'Products added to inventory and finances updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to add to inventory.');
    }
  }, [business?.id, po?.id, selectedIds, sellingPrices, paymentMethod, items, addToInventory, refreshData]);

  const canAddToInventory =
    po &&
    (po.status === 'accepted' || po.status === 'completed') &&
    po.inventory_added !== true &&
    items.length > 0;

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader title="Purchase order" leftAction={<TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color={theme.text.primary} /></TouchableOpacity>} />
        <View style={styles.centered}>
          <Text style={{ color: theme.text.secondary }}>Sign in to view purchase orders.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !po) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader title="Purchase order" leftAction={<TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} color={theme.text.primary} /></TouchableOpacity>} />
        <View style={styles.centered}>
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.accent.primary} />
          ) : (
            <Text style={{ color: theme.text.secondary }}>Order not found.</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Purchase order"
        subtitle={po.supplier_marketplace_profiles?.business_name ?? 'Supplier'}
        icon={ShoppingCart}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.amount, { color: theme.text.primary }]}>{po.currency} {po.total_amount.toLocaleString()}</Text>
          <Text style={[styles.muted, { color: theme.text.tertiary }]}>Status: {po.status}</Text>
          <Text style={[styles.muted, { color: theme.text.tertiary }]}>Created: {new Date(po.created_at).toLocaleDateString()}</Text>
          {po.delivery_address ? <Text style={[styles.muted, { color: theme.text.tertiary }]}>Delivery: {po.delivery_address}</Text> : null}
          {po.notes ? <Text style={[styles.muted, { color: theme.text.tertiary }]}>Notes: {po.notes}</Text> : null}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Items</Text>
        {items.length === 0 ? (
          <Text style={[styles.muted, { color: theme.text.tertiary }]}>No line items.</Text>
        ) : (
          items.map((item) => {
            const name = item.supplier_marketplace_products?.name ?? 'Product';
            const lineTotal = item.quantity * item.unit_price;
            return (
              <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.itemName, { color: theme.text.primary }]}>{name}</Text>
                <Text style={[styles.itemMeta, { color: theme.text.tertiary }]}>
                  {item.quantity} × {po.currency} {item.unit_price.toLocaleString()} = {po.currency} {lineTotal.toLocaleString()}
                </Text>
              </View>
            );
          })
        )}

        {canAddToInventory && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
            onPress={() => {
              setSelectedIds(new Set(items.map((i) => i.id)));
              setModalVisible(true);
            }}
          >
            <Package size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add to inventory</Text>
          </TouchableOpacity>
        )}
        {po.inventory_added && (
          <View style={[styles.badge, { backgroundColor: theme.background.tertiary }]}>
            <Check size={16} color={theme.accent.primary} />
            <Text style={[styles.badgeText, { color: theme.text.secondary }]}>Added to inventory</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.background.card }]}>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Add purchased products to your inventory?</Text>
              <TouchableOpacity onPress={toggleAll} style={styles.selectAllRow}>
                <View style={[styles.checkbox, allSelected && { backgroundColor: theme.accent.primary }]}>
                  {allSelected && <Check size={14} color="#fff" />}
                </View>
                <Text style={[styles.selectAllText, { color: theme.text.primary }]}>Select all</Text>
              </TouchableOpacity>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggle={() => toggleItem(item.id)}
                  sellingPrice={sellingPrices[item.id] ?? ''}
                  onSellingPriceChange={(v) => setSellingPrice(item.id, v)}
                  theme={theme}
                  currency={po.currency}
                />
              ))}
              <Text style={[styles.paymentLabel, { color: theme.text.primary }]}>How did you pay?</Text>
              {PAYMENT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPaymentMethod(opt.value)}
                  style={[styles.radioRow, { backgroundColor: theme.background.tertiary }]}
                >
                  <View style={[styles.radio, paymentMethod === opt.value && { backgroundColor: theme.accent.primary }]}>
                    {paymentMethod === opt.value && <Check size={12} color="#fff" />}
                  </View>
                  <Text style={[styles.radioLabel, { color: theme.text.primary }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
              <Text style={[styles.selectedTotal, { color: theme.text.secondary }]}>
                Total: {po.currency} {selectedTotal.toLocaleString()}
                {paymentMethod === 'credit' && ' (will be recorded as owed to supplier)'}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.background.tertiary }]} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.modalButtonText, { color: theme.text.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.accent.primary }]}
                  onPress={handleAddToInventory}
                  disabled={selectedIds.size === 0 || addToInventory.isPending}
                >
                  {addToInventory.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonTextPrimary}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 16 },
  amount: { fontSize: 22, fontWeight: '700' },
  muted: { fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  itemCard: { padding: 12, borderRadius: 10, marginBottom: 8 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemMeta: { fontSize: 13, marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, marginTop: 16 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderRadius: 10, marginTop: 12 },
  badgeText: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalScroll: { maxHeight: 500, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  selectAllText: { fontSize: 15, fontWeight: '600' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemRow: { padding: 12, borderRadius: 10, marginBottom: 10 },
  itemInfo: { flex: 1 },
  sellingPriceRow: { marginTop: 8 },
  sellingPriceLabel: { fontSize: 12, marginBottom: 4 },
  sellingPriceInput: { padding: 10, borderRadius: 8, fontSize: 15 },
  paymentLabel: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  radioLabel: { fontSize: 15 },
  selectedTotal: { fontSize: 15, marginTop: 12, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalButtonPrimary: {},
  modalButtonText: { fontWeight: '600' },
  modalButtonTextPrimary: { color: '#fff', fontWeight: '600' },
});
