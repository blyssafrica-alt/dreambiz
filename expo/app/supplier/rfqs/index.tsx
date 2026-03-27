import { useRouter } from 'expo-router';
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSupplierRfqs } from '@/hooks/useSupplierRfq';
import type { SupplierRfq } from '@/types/supplier-marketplace';

export default function SupplierRfqsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      setProfileId(data?.id ?? null);
    };
    load();
  }, [user?.id]);

  const { data: rfqs = [], isLoading } = useSupplierRfqs(profileId ?? undefined);

  if (!profileId && !isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Supplier profile not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Requests for quote"
        subtitle="Respond to buyer RFQs"
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
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
          {rfqs.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.background.card }]}>
              <FileText size={48} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No requests for quote yet. Buyers can request a quote from your store.</Text>
            </View>
          ) : (
            rfqs.map((rfq: SupplierRfq) => (
              <TouchableOpacity
                key={rfq.id}
                style={[styles.card, { backgroundColor: theme.background.card }]}
                onPress={() => router.push(`/supplier/rfqs/${rfq.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.surface.info }]}>
                  <FileText size={22} color={theme.accent.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: theme.text.primary }]}>
                    Qty: {rfq.quantity} {rfq.unit ? rfq.unit : ''}
                  </Text>
                  <Text style={[styles.cardSub, { color: theme.text.tertiary }]} numberOfLines={1}>
                    {rfq.notes || 'No notes'}
                  </Text>
                  <Text style={[styles.cardTime, { color: theme.text.tertiary }]}>
                    {new Date(rfq.createdAt).toLocaleDateString()} · {rfq.status}
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
  empty: { padding: 32, borderRadius: 12, alignItems: 'center' },
  emptyText: { marginTop: 12, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 13, marginTop: 2 },
  cardTime: { fontSize: 12, marginTop: 2 },
});
