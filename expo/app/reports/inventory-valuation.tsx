import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, BarChart3 } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';

export default function InventoryValuationReportScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { business, products } = useBusiness();

  const { totalValue, byCategory } = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    let total = 0;
    const byCat = new Map<string, number>();
    for (const p of list) {
      const qty = Number(p.quantity) || 0;
      const cost = Number(p.averageCostPrice ?? p.costPrice) || 0;
      const value = qty * cost;
      total += value;
      const cat = p.category || 'Uncategorized';
      byCat.set(cat, (byCat.get(cat) || 0) + value);
    }
    const categories = Array.from(byCat.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return { totalValue: total, byCategory: categories };
  }, [products]);

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Inventory valuation"
        subtitle="Stock value at cost"
        icon={Package}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.totalCard, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.totalLabel, { color: theme.text.tertiary }]}>Total inventory value</Text>
          <Text style={[styles.totalValue, { color: theme.accent.primary }]}>{formatCurrency(totalValue)}</Text>
          <Text style={[styles.totalHint, { color: theme.text.tertiary }]}>Based on current stock × cost price</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>By category</Text>
        {byCategory.length === 0 ? (
          <Text style={[styles.empty, { color: theme.text.tertiary }]}>No products or categories.</Text>
        ) : (
          byCategory.map((c) => (
            <View key={c.name} style={[styles.categoryRow, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.categoryName, { color: theme.text.primary }]}>{c.name}</Text>
              <Text style={[styles.categoryValue, { color: theme.text.primary }]}>{formatCurrency(c.value)}</Text>
              {totalValue > 0 && (
                <View style={[styles.barBg, { backgroundColor: theme.background.tertiary }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(c.value / totalValue) * 100}%`, backgroundColor: theme.accent.primary },
                    ]}
                  />
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  totalCard: { padding: 20, borderRadius: 12, marginBottom: 20 },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  totalHint: { fontSize: 12, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  empty: { padding: 16 },
  categoryRow: { padding: 14, borderRadius: 10, marginBottom: 8 },
  categoryName: { fontSize: 15, fontWeight: '600' },
  categoryValue: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  barBg: { height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
