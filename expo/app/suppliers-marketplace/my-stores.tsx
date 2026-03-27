import { useRouter } from 'expo-router';
import { Store, ArrowLeft, ExternalLink, Search } from 'lucide-react-native';
import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { useBusiness } from '@/contexts/BusinessContext';

export default function MySupplierStoresScreen() {
  const { theme } = useTheme();
  const { isFeatureVisible } = useFeatures();
  const { suppliers } = useBusiness();
  const router = useRouter();

  const suppliersWithStores = useMemo(
    () => (Array.isArray(suppliers) ? suppliers.filter((s) => s.marketplaceSupplierId) : []),
    [suppliers]
  );

  const canAccess = isFeatureVisible('supplier-marketplace');

  if (!canAccess) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text.secondary }}>Access not available.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="My Supplier Stores"
        subtitle="Quick access to your suppliers' marketplace stores"
        icon={Store}
        iconGradient={['#F59E0B', '#D97706']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {suppliersWithStores.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.background.card }]}>
            <Store size={48} color={theme.text.tertiary} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No supplier stores yet</Text>
            <Text style={[styles.emptyBody, { color: theme.text.secondary }]}>
              Suppliers you add from the marketplace will appear here. Discover suppliers, add them to My Suppliers, then open their stores from this list.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => router.replace('/suppliers-marketplace' as any)}
            >
              <Search size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Find Suppliers</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.hint, { color: theme.text.tertiary }]}>
              {suppliersWithStores.length} supplier{suppliersWithStores.length !== 1 ? 's' : ''} with a marketplace store
            </Text>
            {suppliersWithStores.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.card, { backgroundColor: theme.background.card }]}
                onPress={() => router.push(`/suppliers-marketplace/${s.marketplaceSupplierId}` as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.surface.info }]}>
                  <Store size={22} color={theme.accent.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: theme.text.primary }]} numberOfLines={1}>{s.name}</Text>
                  <Text style={[styles.cardSub, { color: theme.text.secondary }]}>View store & products</Text>
                </View>
                <ExternalLink size={18} color={theme.text.tertiary} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  hint: { fontSize: 13, marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardSub: { fontSize: 14, marginTop: 2 },
  emptyCard: { padding: 28, borderRadius: 16, alignItems: 'center' },
  emptyIcon: { marginBottom: 16 },
  emptyTitle: { fontSize: 19, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  emptyBody: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
