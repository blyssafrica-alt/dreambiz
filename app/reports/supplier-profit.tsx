import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useSupplierProfit } from '@/hooks/useSupplierProfit';

type Period = 'month' | 'quarter' | 'year';

export default function SupplierProfitReportScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { business } = useBusiness();
  const [period, setPeriod] = useState<Period>('month');

  const { start, end } = useMemo(() => {
    const now = new Date();
    let start: Date;
    const end = new Date(now);
    switch (period) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  }, [period]);

  const { data: rows = [], isLoading } = useSupplierProfit(business?.id, start, end);

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier profit"
        subtitle="Profit and margin by supplier"
        icon={BarChart3}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={[styles.periodRow, { backgroundColor: theme.background.card }]}>
        {(['month', 'quarter', 'year'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && { backgroundColor: theme.accent.primary }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodBtnText, { color: period === p ? '#fff' : theme.text.secondary }]}>
              {p === 'month' ? 'Month' : p === 'quarter' ? 'Quarter' : 'Year'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!business?.id ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.text.secondary }}>Select a business.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {rows.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>
              No supplier data in this period. Make purchases from suppliers and sell products linked to them to see profit by supplier.
            </Text>
          ) : (
            rows.map((r) => (
              <View key={r.supplier_id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.supplierName, { color: theme.text.primary }]}>
                  {r.supplier_name || 'Supplier'}
                </Text>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Purchases</Text>
                  <Text style={[styles.value, { color: theme.text.primary }]}>{formatCurrency(r.purchases_value)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Revenue (sold)</Text>
                  <Text style={[styles.value, { color: '#10B981' }]}>{formatCurrency(r.revenue)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: theme.text.tertiary }]}>Cost of goods</Text>
                  <Text style={[styles.value, { color: theme.text.primary }]}>{formatCurrency(r.cogs)}</Text>
                </View>
                <View style={[styles.grossRow, { backgroundColor: theme.background.tertiary }]}>
                  <Text style={[styles.grossLabel, { color: theme.text.primary }]}>Gross profit</Text>
                  <Text style={[styles.grossValue, { color: r.gross_profit >= 0 ? '#10B981' : '#EF4444' }]}>
                    {formatCurrency(r.gross_profit)}
                  </Text>
                </View>
                {r.margin_pct != null && (
                  <Text style={[styles.margin, { color: theme.text.secondary }]}>
                    Margin: {r.margin_pct.toFixed(1)}%
                  </Text>
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
  periodRow: { flexDirection: 'row', padding: 12, gap: 8 },
  periodBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  periodBtnText: { fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', padding: 24 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  supplierName: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600' },
  grossRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 8, marginTop: 8 },
  grossLabel: { fontWeight: '600' },
  grossValue: { fontWeight: '700' },
  margin: { fontSize: 13, marginTop: 6 },
});
