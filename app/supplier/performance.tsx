import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Award, TrendingUp, MessageSquare, AlertCircle, Star, Zap } from 'lucide-react-native';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSupplierPerformance } from '@/hooks/useSupplierPerformance';

export default function SupplierPerformanceScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      setProfileId(data?.id ?? null);
    })();
  }, [user?.id]);

  const { data: perf, isLoading } = useSupplierPerformance(profileId ?? undefined);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Performance"
        subtitle="Your score and how to improve"
        icon={Award}
        iconGradient={['#F59E0B', '#D97706']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      {!profileId ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.text.secondary }}>No supplier profile found.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : !perf ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.text.secondary }}>No performance data yet.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.scoreCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.scoreLabel, { color: theme.text.tertiary }]}>Ranking score</Text>
            <Text style={[styles.scoreValue, { color: theme.accent.primary }]}>
              {perf.ranking_score.toFixed(0)}
            </Text>
            <Text style={[styles.scoreHint, { color: theme.text.tertiary }]}>Higher is better in marketplace</Text>
          </View>

          {perf.badges.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Badges</Text>
              <View style={styles.badgeWrap}>
                {perf.badges.map((b) => (
                  <View key={b} style={[styles.badge, { backgroundColor: theme.background.tertiary }]}>
                    <Award size={14} color={theme.accent.primary} />
                    <Text style={[styles.badgeText, { color: theme.text.primary }]}>{b}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Metrics</Text>
            <View style={styles.metricRow}>
              <Star size={18} color={theme.text.tertiary} />
              <Text style={[styles.metricText, { color: theme.text.secondary }]}>Rating</Text>
              <Text style={[styles.metricValue, { color: theme.text.primary }]}>{perf.avg_rating.toFixed(1)} ({perf.review_count} reviews)</Text>
            </View>
            <View style={styles.metricRow}>
              <MessageSquare size={18} color={theme.text.tertiary} />
              <Text style={[styles.metricText, { color: theme.text.secondary }]}>RFQ response rate</Text>
              <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                {perf.rfq_response_rate_pct != null ? `${perf.rfq_response_rate_pct.toFixed(0)}%` : '—'} ({perf.rfq_responded}/{perf.rfq_total})
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Zap size={18} color={theme.text.tertiary} />
              <Text style={[styles.metricText, { color: theme.text.secondary }]}>Avg response time</Text>
              <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                {perf.avg_response_hours != null ? `${perf.avg_response_hours.toFixed(0)} hours` : '—'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <AlertCircle size={18} color={theme.text.tertiary} />
              <Text style={[styles.metricText, { color: theme.text.secondary }]}>Complaints</Text>
              <Text style={[styles.metricValue, { color: theme.text.primary }]}>{perf.complaint_count}</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>How to improve</Text>
            <Text style={[styles.tip, { color: theme.text.secondary }]}>
              • Respond to RFQs quickly to get "Fast Responder" and "Quick to Quote".
            </Text>
            <Text style={[styles.tip, { color: theme.text.secondary }]}>
              • Ask happy buyers for reviews to build "Top Rated" and "Reliable Supplier".
            </Text>
            <Text style={[styles.tip, { color: theme.text.secondary }]}>
              • Resolve any complaints and keep response time under 24 hours.
            </Text>
          </View>
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
  scoreCard: { padding: 24, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  scoreLabel: { fontSize: 14 },
  scoreValue: { fontSize: 36, fontWeight: '800' },
  scoreHint: { fontSize: 12, marginTop: 4 },
  section: { padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  metricText: { flex: 1, fontSize: 14 },
  metricValue: { fontSize: 14, fontWeight: '600' },
  tip: { fontSize: 14, marginBottom: 8 },
});
