import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Award, TrendingUp } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupplierPerformanceList } from '@/hooks/useSupplierPerformance';

export default function AdminSupplierPerformanceScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: list = [], isLoading } = useSupplierPerformanceList();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier performance"
        subtitle="Ranking and metrics"
        icon={TrendingUp}
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
          {list.length === 0 ? (
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No approved suppliers with performance data.</Text>
          ) : (
            list.map((row, idx) => (
              <View key={row.supplier_id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.rank, { color: theme.text.tertiary }]}>#{idx + 1}</Text>
                  <Text style={[styles.name, { color: theme.text.primary }]}>{row.business_name || 'Supplier'}</Text>
                  <Text style={[styles.score, { color: theme.accent.primary }]}>{row.ranking_score.toFixed(0)}</Text>
                </View>
                <View style={styles.badgesRow}>
                  {row.badges.slice(0, 4).map((b) => (
                    <View key={b} style={[styles.badge, { backgroundColor: theme.background.tertiary }]}>
                      <Award size={12} color={theme.accent.primary} />
                      <Text style={[styles.badgeText, { color: theme.text.secondary }]}>{b}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.metricsRow}>
                  <Text style={[styles.metric, { color: theme.text.tertiary }]}>Rating {row.avg_rating.toFixed(1)}</Text>
                  <Text style={[styles.metric, { color: theme.text.tertiary }]}>
                    RFQ {row.rfq_response_rate_pct != null ? `${row.rfq_response_rate_pct.toFixed(0)}%` : '—'}
                  </Text>
                  <Text style={[styles.metric, { color: theme.text.tertiary }]}>Complaints {row.complaint_count}</Text>
                  <Text style={[styles.metric, { color: theme.text.tertiary }]}>Trust {row.trust_score}</Text>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', padding: 24 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontSize: 14, fontWeight: '600', minWidth: 28 },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  score: { fontSize: 18, fontWeight: '700' },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  badgeText: { fontSize: 11 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  metric: { fontSize: 12 },
});
