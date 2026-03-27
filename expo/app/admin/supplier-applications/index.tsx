import { useRouter } from 'expo-router';
import { ArrowLeft, Truck, Search, FileText } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { supabase } from '@/lib/supabase';

type AppStatus = 'submitted' | 'pending' | 'needs_info';

interface Row {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  /** 'application' = supplier_applications (wizard) → detail screen; 'profile' = supplier_marketplace_profiles pending → suppliers/[id] */
  source: 'application' | 'profile';
}

export default function AdminSupplierApplicationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { isFeatureVisible } = useFeatures();
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const canAccess = isFeatureVisible('supplier-admin');

  useEffect(() => {
    if (!canAccess) return;
    const load = async () => {
      setLoading(true);
      try {
        // Prefer RPC so RLS does not block (function runs as SECURITY DEFINER)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_supplier_applications_for_admin');
        let arr: any[] | null = null;
        if (!rpcError && rpcData != null) {
          if (Array.isArray(rpcData)) {
            arr = rpcData;
          } else if (typeof rpcData === 'string') {
            try {
              const parsed = JSON.parse(rpcData);
              arr = Array.isArray(parsed) ? parsed : null;
            } catch (_) {}
          } else if (typeof rpcData === 'object' && rpcData !== null) {
            if (Array.isArray((rpcData as any).data)) arr = (rpcData as any).data;
            else if (Array.isArray((rpcData as any).result)) arr = (rpcData as any).result;
            else if (typeof (rpcData as any).length === 'number') arr = Array.from(rpcData as any);
          }
        }
        if (arr !== null) {
          const rows: Row[] = arr.map((r: any) => ({
            id: r.id,
            display_name: r.display_name ?? null,
            email: r.email ?? null,
            phone: r.phone ?? null,
            country: r.country ?? null,
            status: r.status ?? 'pending',
            submitted_at: r.submitted_at ?? null,
            created_at: r.created_at ?? '',
            source: (r.source === 'profile' ? 'profile' : 'application') as 'application' | 'profile',
          }));
          setList(rows);
          setLoading(false);
          return;
        }
        // RPC missing or failed: fall back to direct select (requires user to be admin in public.users for RLS)
        const [appsResult, profilesResult] = await Promise.all([
          supabase
            .from('supplier_applications')
            .select('id, display_name, email, phone, country, status, submitted_at, created_at')
            .in('status', ['draft', 'submitted', 'pending', 'needs_info'])
            .order('submitted_at', { ascending: false }),
          supabase
            .from('supplier_marketplace_profiles')
            .select('id, business_name, email, phone, country, status, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
        ]);
        const appRows: Row[] = (appsResult.data || []).map((r: any) => ({
          ...r,
          display_name: r.display_name ?? null,
          submitted_at: r.submitted_at ?? null,
          source: 'application' as const,
        }));
        const profileRows: Row[] = (profilesResult.data || []).map((r: any) => ({
          id: r.id,
          display_name: r.business_name ?? null,
          email: r.email ?? null,
          phone: r.phone ?? null,
          country: r.country ?? null,
          status: 'pending',
          submitted_at: r.created_at,
          created_at: r.created_at,
          source: 'profile' as const,
        }));
        const seen = new Set<string>();
        const merged: Row[] = [];
        for (const r of appRows) {
          merged.push(r);
          seen.add((r.display_name || '') + (r.email || ''));
        }
        for (const r of profileRows) {
          const key = (r.display_name || '') + (r.email || '');
          if (!seen.has(key)) merged.push(r);
          seen.add(key);
        }
        merged.sort((a, b) => new Date(b.submitted_at || b.created_at).getTime() - new Date(a.submitted_at || a.created_at).getTime());
        setList(merged);
      } catch (_) {
        setList([]);
      }
      setLoading(false);
    };
    load();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Access denied.</Text>
      </View>
    );
  }

  const filtered = search
    ? list.filter(
        (r) =>
          (r.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : list;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier Applications"
        subtitle="Review and approve new applications"
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={[styles.searchRow, { backgroundColor: theme.background.card }]}>
        <Search size={18} color={theme.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder="Search by name or email..."
          placeholderTextColor={theme.text.tertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {filtered.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={[styles.empty, { color: theme.text.tertiary }]}>No applications to review.</Text>
              <Text style={[styles.emptyHint, { color: theme.text.tertiary }]}>
                If applications exist in the DB but don’t show here: run database/supplier_applications_admin_rpc.sql in Supabase SQL Editor to load the list. For other admin features run database/grant_supplier_admin.sql with your email.
              </Text>
            </View>
          ) : (
            filtered.map((r) => (
              <TouchableOpacity
                key={`${r.source}-${r.id}`}
                style={[styles.card, { backgroundColor: theme.background.card }]}
                onPress={() =>
                  r.source === 'application'
                    ? router.push(`/admin/supplier-applications/${r.id}` as any)
                    : router.push(`/admin/suppliers/${r.id}` as any)
                }
              >
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{r.display_name || '—'}</Text>
                <Text style={[styles.cardSub, { color: theme.text.secondary }]}>{r.email || '—'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: r.status === 'needs_info' ? '#FEF3C7' : r.source === 'profile' ? '#E5E7EB' : '#E0E7FF' }]}>
                  <Text style={[styles.statusText, { color: r.status === 'needs_info' ? '#92400E' : r.source === 'profile' ? '#374151' : '#3730A3' }]}>
                    {r.source === 'profile' ? 'pending (profile)' : r.status}
                  </Text>
                </View>
                {(r.submitted_at || r.created_at) && (
                  <Text style={[styles.dateText, { color: theme.text.tertiary }]}>{new Date(r.submitted_at || r.created_at).toLocaleDateString()}</Text>
                )}
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 13, marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', padding: 24 },
  emptyBlock: { padding: 24, paddingTop: 12 },
  emptyHint: { fontSize: 12, textAlign: 'center', marginTop: 12, paddingHorizontal: 16, lineHeight: 18 },
});
