import { useRouter } from 'expo-router';
import { ArrowLeft, ShoppingCart, CheckCircle, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert as RNAlert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSupplierPurchaseOrders, useUpdatePOStatusSupplier, type PurchaseOrder } from '@/hooks/usePurchaseOrders';

export default function SupplierPurchaseOrdersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('supplier_marketplace_profiles').select('id').eq('user_id', user.id).eq('status', 'approved').maybeSingle().then(({ data }) => setProfileId(data?.id ?? null));
  }, [user?.id]);

  const { data: orders = [], isLoading } = useSupplierPurchaseOrders(profileId ?? undefined);
  const updateStatus = useUpdatePOStatusSupplier(profileId ?? undefined);

  const handleAccept = (po: PurchaseOrder) => {
    RNAlert.alert('Accept order', `Accept PO for ${po.currency} ${po.total_amount.toLocaleString()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => updateStatus.mutate({ poId: po.id, status: 'accepted' }) },
    ]);
  };
  const handleReject = (po: PurchaseOrder) => {
    RNAlert.alert('Reject order', 'Reject this purchase order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => updateStatus.mutate({ poId: po.id, status: 'rejected' }) },
    ]);
  };

  if (!profileId && !isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Supplier profile not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Purchase orders"
        subtitle="Accept or reject buyer orders"
        icon={ShoppingCart}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {orders.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No purchase orders yet.</Text>
          ) : (
            orders.map((po) => (
              <View key={po.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.amount, { color: theme.text.primary }]}>{po.currency} {po.total_amount.toLocaleString()}</Text>
                <Text style={[styles.muted, { color: theme.text.tertiary }]}>Status: {po.status} · {new Date(po.created_at).toLocaleDateString()}</Text>
                {(po.status === 'sent') && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#D1FAE5' }]} onPress={() => handleAccept(po)} disabled={updateStatus.isPending}>
                      <CheckCircle size={18} color="#065F46" />
                      <Text style={[styles.btnText, { color: '#065F46' }]}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleReject(po)} disabled={updateStatus.isPending}>
                      <XCircle size={18} color="#991B1B" />
                      <Text style={[styles.btnText, { color: '#991B1B' }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', padding: 24 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  amount: { fontSize: 18, fontWeight: '600' },
  muted: { fontSize: 13, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { fontWeight: '600', fontSize: 14 },
});
