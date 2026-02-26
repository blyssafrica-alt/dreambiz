import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

type PORow = {
  id: string;
  supplier_id: string;
  buyer_id: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  supplier_marketplace_profiles: { business_name: string } | null;
};

export default function AdminSupplierPurchaseOrdersScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [list, setList] = useState<PORow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('supplier_purchase_orders')
        .select('id, supplier_id, buyer_id, status, total_amount, currency, created_at, supplier_marketplace_profiles(business_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) setList(data as PORow[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Purchase orders"
        subtitle="All supplier POs"
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
            <Text style={[styles.empty, { color: theme.text.tertiary }]}>No purchase orders.</Text>
          ) : (
            list.map((po) => (
              <View key={po.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                <Text style={[styles.title, { color: theme.text.primary }]}>{po.currency} {Number(po.total_amount).toLocaleString()}</Text>
                <Text style={[styles.muted, { color: theme.text.tertiary }]}>{po.supplier_marketplace_profiles?.business_name ?? '—'} · {po.status} · {new Date(po.created_at).toLocaleString()}</Text>
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
