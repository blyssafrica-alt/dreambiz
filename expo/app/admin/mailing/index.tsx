import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Mail, Send, FileText, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type Campaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  audience_count_estimate: number | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

export default function AdminMailingIndexScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const load = async () => {
    if (!refreshing) setLoading(true);
    try {
      let q = supabase
        .from('email_campaigns')
        .select('id, name, subject, status, audience_count_estimate, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (filter === 'active') {
        q = q.in('status', ['draft', 'scheduled', 'sending']);
      } else if (filter === 'sent') {
        q = q.eq('status', 'sent');
      }
      const { data, error } = await q;
      if (error) throw error;
      setList((data || []) as Campaign[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Mailing"
        subtitle="Email campaigns to suppliers and owners"
        showLogo={false}
        icon={Mail}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={() => router.push('/admin/mailing/new' as any)}>
            <Plus size={24} color={theme.accent.primary} />
          </TouchableOpacity>
        }
      />
      <View style={[styles.quickLinks, { backgroundColor: theme.background.primary }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickLinksContent}>
          <TouchableOpacity style={[styles.quickLink, { backgroundColor: theme.background.card }]} onPress={() => router.push('/admin/mailing/templates' as any)} activeOpacity={0.85}>
            <LinearGradient colors={['#0EA5E915', '#0284C708']} style={styles.quickLinkIcon}>
              <FileText size={20} color="#0EA5E9" strokeWidth={2} />
            </LinearGradient>
            <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickLink, { backgroundColor: theme.background.card }]} onPress={() => router.push('/admin/mailing/segments' as any)} activeOpacity={0.85}>
            <LinearGradient colors={['#0EA5E915', '#0284C708']} style={styles.quickLinkIcon}>
              <Users size={20} color="#0EA5E9" strokeWidth={2} />
            </LinearGradient>
            <Text style={[styles.quickLinkText, { color: theme.text.primary }]}>Segments</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <View style={[styles.filterRow, { backgroundColor: theme.background.primary }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'sent', label: 'Sent' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && { backgroundColor: theme.accent.primary }]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterChipText, { color: filter === f.key ? '#FFF' : theme.text.secondary }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.accent.primary} />}
        >
          {list.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.background.card }]}>
              <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.emptyIconWrap}>
                <Mail size={56} color="#0EA5E9" strokeWidth={1.5} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No campaigns yet</Text>
              <Text style={[styles.emptySub, { color: theme.text.tertiary }]}>
                Create email campaigns for suppliers and business owners.
              </Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.accent.primary }]} onPress={() => router.push('/admin/mailing/new' as any)} activeOpacity={0.85}>
                <Plus size={20} color="#FFF" />
                <Text style={styles.emptyBtnText}>Create campaign</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {list.length > 0 && (
                <View style={styles.statsRow}>
                  <View style={[styles.statPill, { backgroundColor: theme.accent.primary + '18' }]}>
                    <Text style={[styles.statPillValue, { color: theme.accent.primary }]}>{list.length}</Text>
                    <Text style={[styles.statPillLabel, { color: theme.text.secondary }]}>{filter === 'sent' ? 'Sent' : filter === 'active' ? 'Active' : 'Total'}</Text>
                  </View>
                </View>
              )}
              {list.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.card, { backgroundColor: theme.background.card }]}
                onPress={() => router.push(`/admin/mailing/campaign/${c.id}` as any)}
                activeOpacity={0.88}
              >
                <View style={styles.cardLeft}>
                  <LinearGradient colors={c.status === 'sent' ? ['#10B981', '#059669'] : ['#0EA5E9', '#0284C7']} style={styles.cardIconWrap}>
                    {c.status === 'sent' ? <Send size={22} color="#FFF" strokeWidth={2.5} /> : <FileText size={22} color="#FFF" strokeWidth={2.5} />}
                  </LinearGradient>
                  <View style={styles.cardMain}>
                    <Text style={[styles.name, { color: theme.text.primary }]}>{c.name}</Text>
                    <Text style={[styles.subject, { color: theme.text.secondary }]} numberOfLines={1}>{c.subject}</Text>
                    <Text style={[styles.date, { color: theme.text.tertiary }]}>{new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    <View style={styles.row}>
                      <View style={[styles.badge, { backgroundColor: c.status === 'sent' ? '#D1FAE5' : c.status === 'sending' ? '#FEF3C7' : '#E0E7FF' }]}>
                        <Text style={[styles.badgeText, { color: c.status === 'sent' ? '#065F46' : c.status === 'sending' ? '#92400E' : '#3730A3' }]}>
                          {STATUS_LABELS[c.status] || c.status}
                        </Text>
                      </View>
                      {c.audience_count_estimate != null && (
                        <Text style={[styles.audience, { color: theme.text.tertiary }]}>{c.audience_count_estimate} recipients</Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  quickLinks: { paddingHorizontal: 16, paddingVertical: 12 },
  quickLinksContent: { flexDirection: 'row', gap: 12 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  quickLinkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLinkText: { fontSize: 15, fontWeight: '700' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
  filterContent: { gap: 10 },
  filterChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999 },
  filterChipText: { fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyCard: { alignItems: 'center', padding: 40, borderRadius: 24, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  emptyBtn: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  statPill: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, minWidth: 90 },
  statPillValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statPillLabel: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  card: { padding: 20, borderRadius: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  cardLeft: { flexDirection: 'row', gap: 14 },
  cardIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardMain: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  subject: { fontSize: 14, marginBottom: 4 },
  date: { fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  audience: { fontSize: 12 },
});
