import { Stack, router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Package, Download, CheckCircle, Truck, GraduationCap, Ticket, ShoppingBag, FileDown, CalendarPlus, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import type { ProductPurchase } from '@/types/super-admin';
import type { PlatformProduct } from '@/types/super-admin';

interface PurchaseWithProduct {
  purchase: ProductPurchase;
  product: PlatformProduct | null;
}

function mapProductRow(row: any): PlatformProduct | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    shortDescription: row.short_description,
    sku: row.sku,
    type: row.type,
    basePrice: parseFloat(row.base_price || 0),
    currency: row.currency || 'USD',
    salePrice: row.sale_price != null ? parseFloat(row.sale_price) : undefined,
    saleStartDate: row.sale_start_date,
    saleEndDate: row.sale_end_date,
    variations: row.variations || [],
    manageStock: row.manage_stock,
    stockQuantity: row.stock_quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 0,
    stockStatus: row.stock_status,
    images: row.images || [],
    videoUrl: row.video_url,
    categoryId: row.category_id,
    tags: row.tags || [],
    visibilityRules: row.visibility_rules || {},
    status: row.status,
    featured: row.featured,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliveryType: row.delivery_type,
    deliveryConfig: row.delivery_config,
  };
}

function mapPurchaseRow(row: any): ProductPurchase {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    businessId: row.business_id,
    quantity: row.quantity,
    unitPrice: parseFloat(row.unit_price || 0),
    totalPrice: parseFloat(row.total_price || 0),
    currency: row.currency,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    purchasedAt: row.purchased_at ?? row.created_at,
    adId: row.ad_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    orderId: row.order_id,
    fulfillmentStatus: row.fulfillment_status,
    fulfillmentMetadata: row.fulfillment_metadata,
    typeSnapshot: row.type_snapshot,
  };
}

type PurchasesTab = 'all' | 'digital' | 'courses' | 'orders' | 'tickets';

function filterByTab(items: PurchaseWithProduct[], tab: PurchasesTab): PurchaseWithProduct[] {
  if (tab === 'all') return items;
  return items.filter((item) => {
    const type = item.product?.type || (item.purchase.typeSnapshot as any)?.type;
    const status = item.purchase.fulfillmentStatus;
    if (tab === 'digital') return type === 'digital' || status === 'unlocked';
    if (tab === 'courses') return type === 'course' || status === 'enrolled';
    if (tab === 'orders') return type === 'physical' || status === 'shipped' || status === 'pending' || status === 'delivered' || status === 'processing';
    if (tab === 'tickets') return type === 'event' || status === 'ticket_issued';
    return true;
  });
}

export default function MyPurchasesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<PurchaseWithProduct[]>([]);
  const [activeTab, setActiveTab] = useState<PurchasesTab>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadPurchases = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('product_purchases')
        .select('*')
        .eq('user_id', user.id)
        .in('payment_status', ['completed', 'pending'])
        .order('created_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      if (!purchasesData?.length) {
        setItems([]);
        return;
      }

      const productIds = [...new Set(purchasesData.map((p: any) => p.product_id))];
      const { data: productsData, error: productsError } = await supabase
        .from('platform_products')
        .select('*')
        .in('id', productIds);

      if (productsError) throw productsError;

      const productMap: Record<string, PlatformProduct> = {};
      (productsData || []).forEach((row: any) => {
        const p = mapProductRow(row);
        if (p) productMap[p.id] = p;
      });

      const list: PurchaseWithProduct[] = (purchasesData || []).map((row: any) => ({
        purchase: mapPurchaseRow(row),
        product: productMap[row.product_id] ?? null,
      }));
      setItems(list);
    } catch (error) {
      console.error('Failed to load purchases:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPurchases();
  };

  const handleAccess = (item: PurchaseWithProduct) => {
    const status = item.purchase.fulfillmentStatus ?? 'pending';
    const meta = item.purchase.fulfillmentMetadata ?? {};
    if (status === 'unlocked' && meta.download_url) {
      Linking.openURL(meta.download_url as string).catch(() =>
        Alert.alert('Error', 'Could not open link')
      );
      return;
    }
    if (status === 'enrolled' && meta.course_link) {
      Linking.openURL(meta.course_link as string).catch(() =>
        Alert.alert('Error', 'Could not open link')
      );
      return;
    }
    if (status === 'unlocked') {
      Alert.alert('Access', 'Download link is available in your order details. Contact support if you need help.');
    }
  };

  const handleTrackShipping = (item: PurchaseWithProduct) => {
    const meta = item.purchase.fulfillmentMetadata ?? {};
    const url = meta.tracking_url as string | undefined;
    if (url) {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open tracking link'));
    } else {
      Alert.alert('Track order', 'Tracking will appear here once your order is dispatched. Check back later.');
    }
  };

  const handleViewTicket = (item: PurchaseWithProduct) => {
    const meta = item.purchase.fulfillmentMetadata ?? {};
    const ticketUrl = meta.downloadable_ticket_url as string | undefined;
    const ticketCode = meta.ticket_code as string | undefined;
    if (ticketUrl) {
      Linking.openURL(ticketUrl).catch(() => Alert.alert('Error', 'Could not open ticket'));
    } else if (ticketCode) {
      Alert.alert('Your ticket', `Ticket code: ${ticketCode}\n\nShow this at the venue.`);
    } else {
      Alert.alert('Ticket', 'Your ticket is confirmed. Show your order confirmation at the venue.');
    }
  };

  const handleProductPress = (item: PurchaseWithProduct) => {
    if (item.product?.id) {
      router.push(`/(tabs)/store/${item.product.id}` as any);
    }
  };

  const handleRemovePending = (item: PurchaseWithProduct) => {
    if (item.purchase.paymentStatus !== 'pending') return;
    Alert.alert(
      'Remove pending order',
      'This will remove this pending order from your list. You can add the product again from the store if you change your mind.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(item.purchase.id);
            try {
              const { error } = await supabase
                .from('product_purchases')
                .delete()
                .eq('id', item.purchase.id)
                .eq('user_id', user?.id);
              if (error) throw error;
              setItems((prev) => prev.filter((i) => i.purchase.id !== item.purchase.id));
            } catch (e) {
              Alert.alert('Error', (e as Error)?.message ?? 'Could not remove. You may need to contact support.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusInfo = (purchase: ProductPurchase) => {
    const status = purchase.fulfillmentStatus ?? 'pending';
    const meta = purchase.fulfillmentMetadata ?? {};
    switch (status) {
      case 'unlocked':
        return {
          icon: Download,
          label: 'Digital · Ready',
          sub: meta.download_url ? 'Tap to download or open' : 'Access in app',
          canAccess: true,
        };
      case 'shipped':
      case 'delivered':
      case 'processing':
        return { icon: Truck, label: status === 'delivered' ? 'Delivered' : status === 'shipped' ? 'Shipped' : 'Processing', sub: 'Track in order details', canAccess: true };
      case 'pending':
        return { icon: Truck, label: 'We\'ll ship soon', sub: 'You\'ll get updates here', canAccess: false };
      case 'enrolled':
        return {
          icon: GraduationCap,
          label: 'Enrolled',
          sub: meta.course_platform ? `Via ${String(meta.course_platform)}` : 'Check your messages',
          canAccess: !!meta.course_link,
        };
      case 'ticket_issued':
        return {
          icon: Ticket,
          label: 'Ticket',
          sub: meta.event_name ? String(meta.event_name) : `${purchase.quantity} ticket(s)`,
          canAccess: true,
        };
      default:
        return {
          icon: Package,
          label: purchase.paymentStatus === 'pending' ? 'Pending verification' : 'Recorded',
          sub: '',
          canAccess: false,
        };
    }
  };

  const completedCount = items.filter((i) => i.purchase.paymentStatus === 'completed').length;
  const pendingCount = items.filter((i) => i.purchase.paymentStatus === 'pending').length;
  const tabFiltered = filterByTab(items, activeTab);
  const filteredItems =
    statusFilter === 'all'
      ? tabFiltered
      : tabFiltered.filter((i) => i.purchase.paymentStatus === statusFilter);

  const tabs: { key: PurchasesTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'digital', label: 'Digital' },
    { key: 'courses', label: 'Courses' },
    { key: 'orders', label: 'Orders' },
    { key: 'tickets', label: 'Tickets' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'My Purchases', headerShown: false }} />

      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>My Purchases</Text>
        <View style={styles.headerRight} />
      </View>

      {items.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabsScroll, { backgroundColor: theme.background.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.light }]}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabChip,
                { backgroundColor: activeTab === tab.key ? theme.accent.primary : theme.background.secondary },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabChipText, { color: activeTab === tab.key ? '#FFF' : theme.text.secondary }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading your purchases...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={64} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.primary }]}>No store purchases yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.text.secondary }]}>
            Browse the store and complete a purchase. Digital items will appear here and you can access them in the app.
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: theme.accent.primary }]}
            onPress={() => router.push('/(tabs)/store' as any)}
          >
            <Text style={styles.browseButtonText}>Browse Store</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accent.primary]} />
          }
        >
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: theme.background.card },
                statusFilter === 'all' && styles.statCardSelected,
                statusFilter === 'all' && { borderColor: theme.accent.primary, borderWidth: 2 },
              ]}
              onPress={() => setStatusFilter('all')}
              activeOpacity={0.85}
            >
              <Text style={[styles.statNumber, { color: theme.accent.primary }]}>{items.length}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Items</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: theme.background.card },
                statusFilter === 'completed' && styles.statCardSelected,
                statusFilter === 'completed' && { borderColor: theme.accent.success, borderWidth: 2 },
              ]}
              onPress={() => setStatusFilter('completed')}
              activeOpacity={0.85}
            >
              <Text style={[styles.statNumber, { color: theme.accent.success }]}>{completedCount}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Completed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statCard,
                { backgroundColor: theme.background.card },
                statusFilter === 'pending' && styles.statCardSelected,
                statusFilter === 'pending' && { borderColor: theme.accent.warning, borderWidth: 2 },
              ]}
              onPress={() => setStatusFilter('pending')}
              activeOpacity={0.85}
            >
              <Text style={[styles.statNumber, { color: theme.accent.warning }]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Pending</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Your orders & access</Text>

          {filteredItems.length === 0 && (
            <View style={[styles.emptyTabState, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.emptyTabText, { color: theme.text.secondary }]}>
                {statusFilter === 'pending' ? 'No pending orders.' : statusFilter === 'completed' ? 'No completed orders.' : 'No items in this category yet.'}
              </Text>
            </View>
          )}
          {filteredItems.map((item) => {
            const product = item.product;
            const purchase = item.purchase;
            const name = product?.name ?? 'Product';
            const imageUri = product?.images?.[0];
            const statusInfo = getStatusInfo(purchase);
            const StatusIcon = statusInfo.icon;

            return (
              <View key={purchase.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <TouchableOpacity style={styles.cardInner} onPress={() => handleProductPress(item)} activeOpacity={0.9}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: theme.background.secondary }]}>
                      <Package size={28} color={theme.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={[styles.productName, { color: theme.text.primary }]} numberOfLines={2}>
                      {name}
                    </Text>
                    <Text style={[styles.quantity, { color: theme.text.tertiary }]}>
                      Qty {purchase.quantity} · {purchase.currency} {purchase.totalPrice.toFixed(2)}
                    </Text>
                    <Text style={[styles.date, { color: theme.text.tertiary }]}>
                      {new Date(purchase.purchasedAt || purchase.createdAt).toLocaleDateString()}
                      {purchase.paymentStatus === 'pending' && ' · Pending verification'}
                    </Text>
                    <View style={[styles.statusRow, { backgroundColor: theme.background.secondary }]}>
                      <StatusIcon size={16} color={theme.accent.primary} />
                      <Text style={[styles.statusLabel, { color: theme.text.secondary }]}>{statusInfo.label}</Text>
                      {statusInfo.sub ? (
                        <Text style={[styles.statusSub, { color: theme.text.tertiary }]} numberOfLines={1}>
                          {statusInfo.sub}
                        </Text>
                      ) : null}
                    </View>
                    {purchase.paymentStatus === 'completed' && statusInfo.canAccess && (
                      <View style={styles.actionRow}>
                        {(purchase.fulfillmentStatus === 'unlocked' || purchase.fulfillmentStatus === 'enrolled') && (
                          <TouchableOpacity
                            style={[styles.accessBtn, { backgroundColor: theme.accent.primary }]}
                            onPress={() => handleAccess(item)}
                          >
                            <Download size={16} color="#FFF" />
                            <Text style={styles.accessBtnText}>
                              {purchase.fulfillmentStatus === 'unlocked' ? 'Download / Open' : 'Continue'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {(purchase.fulfillmentStatus === 'shipped' || purchase.fulfillmentStatus === 'delivered' || purchase.fulfillmentStatus === 'processing') && (
                          <TouchableOpacity
                            style={[styles.accessBtn, { backgroundColor: theme.accent.primary }]}
                            onPress={() => handleTrackShipping(item)}
                          >
                            <Truck size={16} color="#FFF" />
                            <Text style={styles.accessBtnText}>Track shipping</Text>
                          </TouchableOpacity>
                        )}
                        {purchase.fulfillmentStatus === 'ticket_issued' && (
                          <TouchableOpacity
                            style={[styles.accessBtn, { backgroundColor: theme.accent.primary }]}
                            onPress={() => handleViewTicket(item)}
                          >
                            <Ticket size={16} color="#FFF" />
                            <Text style={styles.accessBtnText}>View ticket</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {purchase.paymentStatus === 'pending' && (statusInfo.canAccess || purchase.fulfillmentStatus === 'ticket_issued') && (
                      <Text style={[styles.pendingHint, { color: theme.text.tertiary }]}>Access after payment verification</Text>
                    )}
                  </View>
                </TouchableOpacity>
                {purchase.paymentStatus === 'pending' && (
                  <View style={styles.removePendingWrap}>
                    <TouchableOpacity
                      style={[styles.removePendingBtn, { borderColor: theme.accent.danger }]}
                      onPress={() => handleRemovePending(item)}
                      disabled={removingId === purchase.id}
                    >
                      {removingId === purchase.id ? (
                        <ActivityIndicator size="small" color={theme.accent.danger} />
                      ) : (
                        <>
                          <X size={14} color={theme.accent.danger} strokeWidth={2.5} />
                          <Text style={[styles.removePendingBtnText, { color: theme.accent.danger }]}>Remove</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerBack: { padding: 8, marginLeft: -8 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  headerRight: { width: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24, marginBottom: 24 },
  browseButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  browseButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardSelected: {},
  statNumber: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  removePendingWrap: { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
  removePendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  removePendingBtnText: { fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardInner: { flexDirection: 'row', padding: 14 },
  thumb: { width: 88, height: 88, borderRadius: 12 },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
  productName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  quantity: { fontSize: 13, marginBottom: 2 },
  date: { fontSize: 12, marginBottom: 8 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  statusLabel: { fontSize: 12, fontWeight: '600' },
  statusSub: { fontSize: 11, flex: 1 },
  accessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  accessBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pendingHint: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  tabsScroll: { maxHeight: 52 },
  tabsContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabChipText: { fontSize: 14, fontWeight: '600' },
  emptyTabState: { padding: 24, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  emptyTabText: { fontSize: 14 },
});
