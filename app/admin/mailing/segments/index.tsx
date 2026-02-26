import { useRouter } from 'expo-router';
import { ArrowLeft, FolderOpen, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type Segment = {
  id: string;
  name: string;
  description: string | null;
  segment_config: Record<string, unknown>;
  created_at: string;
};

export default function AdminMailingSegmentsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('saved_segments')
      .select('id, name, description, segment_config, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setList((data || []) as Segment[]);
        setLoading(false);
      });
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Saved segments"
        subtitle="Reuse audience filters"
        showLogo={false}
        icon={FolderOpen}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {list.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
              <LinearGradient colors={['#0EA5E918', '#0284C708']} style={styles.emptyIconWrap}>
                <FolderOpen size={64} color="#0EA5E9" strokeWidth={1.5} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No saved segments</Text>
              <Text style={[styles.emptySub, { color: theme.text.tertiary }]}>
                On step 2 (Audience) of a new campaign, configure your filters and tap Save segment. Reuse them here for future campaigns.
              </Text>
            </View>
          ) : (
            list.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.card, { backgroundColor: theme.background.card }]}
                onPress={() => router.push({ pathname: '/admin/mailing/new', params: { segmentId: s.id } } as any)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#0EA5E915', '#0284C708']} style={styles.cardIcon}>
                  <FolderOpen size={24} color="#0EA5E9" strokeWidth={2} />
                </LinearGradient>
                <View style={styles.cardContent}>
                  <Text style={[styles.name, { color: theme.text.primary }]}>{s.name}</Text>
                  {s.description && (
                    <Text style={[styles.desc, { color: theme.text.tertiary }]} numberOfLines={2}>{s.description}</Text>
                  )}
                  <Text style={[styles.config, { color: theme.text.tertiary }]} numberOfLines={1}>
                    {JSON.stringify(s.segment_config)}
                  </Text>
                </View>
                <ChevronRight size={20} color={theme.text.tertiary} />
              </TouchableOpacity>
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
  empty: { padding: 40, borderRadius: 24, alignItems: 'center', marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  emptyIconWrap: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  desc: { fontSize: 14, marginBottom: 4 },
  config: { fontSize: 11, fontFamily: 'monospace', opacity: 0.8 },
});
