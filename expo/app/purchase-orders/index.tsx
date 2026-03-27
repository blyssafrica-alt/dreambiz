import { useRouter } from 'expo-router';
import { ArrowLeft, ShoppingCart, FileText, ChevronRight, Package } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBuyerPurchaseOrders } from '@/hooks/usePurchaseOrders';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: '#F3F4F6', text: '#6B7280' },
  sent: { label: 'Sent', bg: '#DBEAFE', text: '#1D4ED8' },
  accepted: { label: 'Accepted', bg: '#D1FAE5', text: '#047857' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', text: '#B91C1C' },
  completed: { label: 'Completed', bg: '#D1FAE5', text: '#065F46' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', text: '#991B1B' },
};

export default function BuyerPurchaseOrdersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useBuyerPurchaseOrders(user?.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Purchase orders"
        subtitle="Your orders to suppliers"
        icon={ShoppingCart}
        iconGradient={['#10B981', '#059669']}
        showLogo={false}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />
      {!user ? (
        <View style={[styles.emptyState, { backgroundColor: theme.background.primary }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.background.secondary }]}>
            <ShoppingCart size={48} color={theme.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Sign in to view orders</Text>
          <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>Create purchase orders from quotes or directly from suppliers</Text>
        </View>
      ) : isLoading ? (
        <View style={[styles.loadingWrap, { backgroundColor: theme.background.secondary }]}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.rfqCard, { backgroundColor: theme.accent.primary + '12', borderColor: theme.accent.primary + '30' }]}
            onPress={() => router.push('/rfq' as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.rfqIconWrap, { backgroundColor: theme.accent.primary + '25' }]}>
              <FileText size={24} color={theme.accent.primary} />
            </View>
            <View style={styles.rfqTextWrap}>
              <Text style={[styles.rfqTitle, { color: theme.text.primary }]}>My requests for quote</Text>
              <Text style={[styles.rfqSubtitle, { color: theme.text.secondary }]}>View quotes and create orders</Text>
            </View>
            <ChevronRight size={22} color={theme.accent.primary} />
          </TouchableOpacity>

          {orders.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.background.primary }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.background.secondary }]}>
                <ShoppingCart size={48} color={theme.accent.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No purchase orders yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
                Request a quote from a supplier store, then create an order when you receive their response
              </Text>
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: theme.accent.primary }]}
                onPress={() => router.push('/suppliers-marketplace' as any)}
              >
                <Package size={18} color="#FFF" />
                <Text style={styles.ctaBtnText}>Find suppliers</Text>
                <ChevronRight size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            orders.map((po) => {
              const statusCfg = STATUS_CONFIG[po.status] ?? { label: po.status, bg: '#F3F4F6', text: '#6B7280' };
              const supplierName = po.supplier_marketplace_profiles?.business_name ?? 'Supplier';
              return (
                <TouchableOpacity
                  key={po.id}
                  style={[styles.card, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push(`/purchase-orders/${po.id}` as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardMain}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.amount, { color: theme.text.primary }]}>
                        {po.currency} {po.total_amount.toLocaleString()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                      </View>
                    </View>
                    <View style={styles.cardBottom}>
                      <Text style={[styles.supplierText, { color: theme.text.secondary }]} numberOfLines={1}>
                        {supplierName}
                      </Text>
                      <Text style={[styles.dateText, { color: theme.text.tertiary }]}>
                        {new Date(po.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={22} color={theme.text.tertiary} />
                </TouchableOpacity>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rfqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  rfqIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rfqTextWrap: { flex: 1 },
  rfqTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  rfqSubtitle: { fontSize: 14 },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  ctaBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardMain: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amount: { fontSize: 22, fontWeight: '800' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supplierText: { fontSize: 15, flex: 1 },
  dateText: { fontSize: 14 },
});
