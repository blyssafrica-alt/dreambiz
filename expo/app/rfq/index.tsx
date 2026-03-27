import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, ChevronRight, Package, MessageSquare } from 'lucide-react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBuyerRfqs } from '@/hooks/useSupplierRfq';
import type { SupplierRfq } from '@/types/supplier-marketplace';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: 'Awaiting quote', bg: '#DBEAFE', text: '#1D4ED8' },
  quoted: { label: 'Quoted', bg: '#D1FAE5', text: '#047857' },
  accepted: { label: 'Accepted', bg: '#D1FAE5', text: '#065F46' },
  declined: { label: 'Declined', bg: '#FEE2E2', text: '#B91C1C' },
  expired: { label: 'Expired', bg: '#F3F4F6', text: '#6B7280' },
};

export default function BuyerRfqListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data: rfqs = [], isLoading } = useBuyerRfqs(user?.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="My requests for quote"
        subtitle="View quotes and create orders"
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
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
            <MessageSquare size={48} color={theme.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Sign in to view your RFQs</Text>
          <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>Request quotes from suppliers and track responses here</Text>
        </View>
      ) : isLoading ? (
        <View style={[styles.loadingWrap, { backgroundColor: theme.background.secondary }]}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {rfqs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.background.primary }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.background.secondary }]}>
                <FileText size={48} color={theme.accent.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No quotes requested yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>
                Browse the supplier marketplace and request quotes from products you're interested in
              </Text>
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: theme.accent.primary }]}
                onPress={() => router.push('/suppliers-marketplace' as any)}
              >
                <Package size={18} color="#FFF" />
                <Text style={styles.ctaBtnText}>Browse suppliers</Text>
                <ChevronRight size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            rfqs.map((rfq: SupplierRfq) => {
              const statusCfg = STATUS_CONFIG[rfq.status] ?? { label: rfq.status, bg: '#F3F4F6', text: '#6B7280' };
              return (
                <TouchableOpacity
                  key={rfq.id}
                  style={[styles.card, { backgroundColor: theme.background.card }]}
                  onPress={() => router.push({ pathname: '/rfq/[rfqId]', params: { rfqId: rfq.id } } as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.quantityBadge, { backgroundColor: theme.accent.primary + '18' }]}>
                      <Text style={[styles.quantityText, { color: theme.accent.primary }]}>
                        {rfq.quantity} {rfq.unit || 'piece'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={[styles.dateText, { color: theme.text.tertiary }]}>
                      {new Date(rfq.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <ChevronRight size={20} color={theme.text.tertiary} />
                  </View>
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
  emptyState: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quantityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quantityText: { fontSize: 15, fontWeight: '700' },
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
  dateText: { fontSize: 14 },
});
