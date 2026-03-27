import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FileText, ShoppingCart } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert as RNAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRfqQuotes } from '@/hooks/useSupplierRfq';
import { useCreatePurchaseOrder, useSendPurchaseOrder } from '@/hooks/usePurchaseOrders';
import { recordSupplierEvent } from '@/lib/supplier-analytics';
import type { SupplierQuote } from '@/types/supplier-marketplace';

type RfqRow = {
  id: string;
  supplier_profile_id: string;
  product_id: string | null;
  quantity: number;
  unit: string | null;
  status: string;
};

export default function BuyerRfqDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { rfqId } = useLocalSearchParams<{ rfqId: string }>();
  const { user } = useAuth();
  const [rfq, setRfq] = useState<RfqRow | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: quotes = [] } = useRfqQuotes(rfqId);
  const createPO = useCreatePurchaseOrder(user?.id);
  const sendPO = useSendPurchaseOrder(user?.id);

  useEffect(() => {
    if (!rfqId || !user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data, error } = await supabase.from('supplier_rfqs').select('id, supplier_profile_id, product_id, quantity, unit, status').eq('id', rfqId).eq('buyer_user_id', user.id).single();
      if (!error && data) setRfq(data as RfqRow);
      setLoading(false);
    };
    load();
  }, [rfqId, user?.id]);

  const createPOFromQuote = async (quote: SupplierQuote) => {
    if (!rfq || !user?.id) return;
    const qty = rfq.quantity;
    const total = qty * quote.unitPrice;
    if (!rfq.product_id) {
      RNAlert.alert('Cannot create order', 'This request has no product linked. Create a purchase order from the supplier profile instead.');
      return;
    }
    try {
      const po = await createPO.mutateAsync({
        supplier_id: rfq.supplier_profile_id,
        rfq_id: rfq.id,
        total_amount: total,
        currency: quote.currency ?? 'USD',
        items: [{ product_id: rfq.product_id, quantity: qty, unit_price: quote.unitPrice }],
      });
      await sendPO.mutateAsync(po.id);
      recordSupplierEvent(rfq.supplier_profile_id, 'po_created', { userId: user?.id });
      RNAlert.alert('Order sent', 'Your purchase order has been sent to the supplier.', [
        { text: 'OK', onPress: () => router.push('/purchase-orders' as any) },
      ]);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not create order.');
    }
  };

  if (loading || !rfq) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        {loading ? <ActivityIndicator size="large" color={theme.accent.primary} /> : <Text style={{ color: theme.text.secondary }}>RFQ not found.</Text>}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Request for quote"
        subtitle={`Qty: ${rfq.quantity}${rfq.unit ? ` ${rfq.unit}` : ''}`}
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.status, { color: theme.text.tertiary }]}>{rfq.status}</Text>
        {quotes.length === 0 ? (
          <Text style={[styles.body, { color: theme.text.tertiary }]}>No quotes yet. The supplier will respond here.</Text>
        ) : (
          quotes.map((q: SupplierQuote) => (
            <View key={q.id} style={[styles.quoteCard, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.price, { color: theme.text.primary }]}>{q.currency} {q.unitPrice.toLocaleString()} per unit</Text>
              <Text style={[styles.muted, { color: theme.text.tertiary }]}>Total: {q.currency} {(rfq.quantity * q.unitPrice).toLocaleString()}</Text>
              {q.leadTimeDays != null && <Text style={[styles.muted, { color: theme.text.tertiary }]}>Lead time: {q.leadTimeDays} days</Text>}
              <TouchableOpacity
                style={[styles.poBtn, { backgroundColor: theme.accent.primary }]}
                onPress={() => createPOFromQuote(q)}
                disabled={createPO.isPending || sendPO.isPending}
              >
                {createPO.isPending || sendPO.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <ShoppingCart size={18} color="#FFF" />
                    <Text style={styles.poBtnText}>Create purchase order</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  status: { fontSize: 14, marginBottom: 12 },
  body: { fontSize: 15 },
  quoteCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  price: { fontSize: 18, fontWeight: '600' },
  muted: { fontSize: 13, marginTop: 4 },
  poBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 10 },
  poBtnText: { color: '#FFF', fontWeight: '600' },
});
