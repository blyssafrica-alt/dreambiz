import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type RfqRow = {
  id: string;
  supplier_profile_id: string;
  buyer_user_id: string;
  quantity: number;
  status: string;
  created_at: string;
  supplier_marketplace_profiles: { business_name: string } | null;
};

export default function AdminSupplierRfqsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<RfqRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('supplier_rfqs')
        .select('id, supplier_profile_id, buyer_user_id, quantity, status, created_at, supplier_marketplace_profiles(business_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) setList(data as RfqRow[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier RFQs"
        subtitle="All requests for quote"
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
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No RFQs.</Text>
          ) : (
            list.map((r) => (
              <View key={r.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.title, { color: theme.text.primary }]}>{r.supplier_marketplace_profiles?.business_name ?? '—'}</Text>
                <Text style={[styles.muted, { color: theme.text.tertiary }]}>Qty: {r.quantity} · {r.status} · {new Date(r.created_at).toLocaleString()}</Text>
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
  title: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 13, marginTop: 4 },
});
