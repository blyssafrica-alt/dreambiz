import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, ChevronRight } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type ComplaintRow = {
  id: string;
  subject: string;
  description: string;
  status: string;
  supplier_response: string | null;
  created_at: string;
};

export default function SupplierComplaintsListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [list, setList] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: profile } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      setProfileId(profile?.id ?? null);
      if (!profile?.id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('supplier_marketplace_complaints')
        .select('id, subject, description, status, supplier_response, created_at')
        .eq('supplier_profile_id', profile.id)
        .order('created_at', { ascending: false });
      if (!error && data) setList(data as ComplaintRow[]);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (!profileId && !loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Supplier profile not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Complaints"
        subtitle="Complaints against your store"
        icon={AlertCircle}
        iconGradient={['#F59E0B', '#D97706']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
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
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No complaints yet.</Text>
          ) : (
            list.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.card, { backgroundColor: theme.background.card }]}
                onPress={() => router.push({ pathname: '/supplier/complaints/[id]', params: { id: c.id } } as any)}
                activeOpacity={0.7}
              >
                <View style={styles.cardRow}>
                  <Text style={[styles.subject, { color: theme.text.primary }]} numberOfLines={1}>{c.subject}</Text>
                  <ChevronRight size={20} color={theme.text.tertiary} />
                </View>
                <Text style={[styles.body, { color: theme.text.secondary }]} numberOfLines={2}>{c.description}</Text>
                <View style={styles.footer}>
                  <Text style={[styles.statusBadge, { color: theme.text.tertiary }]}>{c.status.replace('_', ' ')}</Text>
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>{new Date(c.created_at).toLocaleDateString()}</Text>
                </View>
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
  empty: { textAlign: 'center', padding: 24 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subject: { fontSize: 16, fontWeight: '600', flex: 1 },
  body: { fontSize: 14, marginTop: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  statusBadge: { fontSize: 12 },
  muted: { fontSize: 12 },
});
