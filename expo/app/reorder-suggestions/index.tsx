import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, RefreshCw, ShoppingCart, X, Clock } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  useReorderSuggestions,
  useGenerateReorderSuggestions,
  useUpdateReorderSuggestionStatus,
  useCreatePOFromSuggestion,
  type ReorderSuggestion,
} from '@/hooks/useReorderSuggestions';

const REASON_LABEL: Record<string, string> = {
  below_reorder_level: 'Low stock',
  fast_selling: 'Selling fast',
  stockout_risk: 'May run out soon',
  seasonal: 'Seasonal restock',
};

export default function ReorderSuggestionsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { business } = useBusiness();
  const businessId = business?.id;

  const { data: suggestions = [], isLoading } = useReorderSuggestions(businessId);
  const generate = useGenerateReorderSuggestions(businessId);
  const updateStatus = useUpdateReorderSuggestionStatus(businessId);
  const createPO = useCreatePOFromSuggestion(businessId);
  const queryClient = useQueryClient();

  const handleReorder = async (s: ReorderSuggestion) => {
    try {
      const result = await createPO.mutateAsync(s.id);
      Alert.alert('Order created', 'Draft purchase order created. You can edit and send it from Purchase orders.');
      if (result?.purchase_order_id) {
        await queryClient.refetchQueries({ queryKey: ['purchase-orders-buyer'] });
        router.push(`/purchase-orders/${result.purchase_order_id}` as any);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not create order');
    }
  };

  const handleDismiss = (id: string) => {
    updateStatus.mutate({ id, status: 'dismissed' });
  };

  const handleSnooze = (id: string) => {
    updateStatus.mutate({ id, status: 'snoozed' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Reorder suggestions"
        subtitle="Restock before you run out"
        icon={Package}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: theme.accent.primary }]}
          onPress={() => generate.mutate()}
          disabled={generate.isPending || !businessId}
        >
          {generate.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <RefreshCw size={18} color="#fff" />
          )}
          <Text style={styles.generateBtnText}>Refresh suggestions</Text>
        </TouchableOpacity>
      </View>
      {!businessId ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.text.secondary }}>Select a business to see suggestions.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {suggestions.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>
              No reorder suggestions right now. Tap "Refresh suggestions" to check stock levels.
            </Text>
          ) : (
            suggestions.map((s) => (
              <View key={s.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.productName, { color: theme.text.primary }]}>
                  {s.products?.name ?? 'Product'}
                </Text>
                <Text style={[styles.reason, { color: theme.text.secondary }]}>
                  {REASON_LABEL[s.reason] ?? s.reason}
                </Text>
                <Text style={[styles.meta, { color: theme.text.tertiary }]}>
                  Suggest ordering {s.suggested_quantity} units
                  {s.supplier_marketplace_profiles?.business_name
                    ? ` from ${s.supplier_marketplace_profiles.business_name}`
                    : ' — choose a supplier'}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
                    onPress={() => handleReorder(s)}
                    disabled={createPO.isPending}
                  >
                    <ShoppingCart size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>Reorder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.background.tertiary }]}
                    onPress={() => handleSnooze(s.id)}
                    disabled={updateStatus.isPending}
                  >
                    <Clock size={16} color={theme.text.secondary} />
                    <Text style={[styles.secondaryBtnText, { color: theme.text.secondary }]}>Snooze</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.background.tertiary }]}
                    onPress={() => handleDismiss(s.id)}
                    disabled={updateStatus.isPending}
                  >
                    <X size={16} color={theme.text.secondary} />
                    <Text style={[styles.secondaryBtnText, { color: theme.text.secondary }]}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
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
  actions: { paddingHorizontal: 16, paddingVertical: 8 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10 },
  generateBtnText: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', padding: 24 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  productName: { fontSize: 17, fontWeight: '600' },
  reason: { fontSize: 14, marginTop: 4 },
  meta: { fontSize: 13, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  primaryBtn: {},
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  secondaryBtnText: { fontWeight: '500' },
});
