import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CreditCard } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useConfirmPlacementPayment } from '@/hooks/useSponsoredPlacements';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';

type PlacementRow = {
  id: string;
  placement: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment_status: string;
  price_amount: number | null;
  currency: string | null;
};

export default function PromotePayScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];
  const [placement, setPlacement] = useState<PlacementRow | null>(null);
  const [loading, setLoading] = useState(true);
  const confirmPayment = useConfirmPlacementPayment(id ?? null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from('supplier_sponsored_placements')
        .select('id, placement, starts_at, ends_at, status, payment_status, price_amount, currency')
        .eq('id', id)
        .single();
      if (!error && data) setPlacement(data as PlacementRow);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleConfirmPayment = () => {
    if (!placement || placement.payment_status === 'paid') return;
    RNAlert.alert(
      'Confirm payment',
      `Mark this placement as paid for ${placement.currency ?? 'USD'} ${Number(placement.price_amount ?? 0).toFixed(2)}? After confirmation, your request will be sent for admin approval.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await confirmPayment.mutateAsync();
              RNAlert.alert(
                'Payment recorded',
                'Your placement is now pending admin approval. You will see it on the Promote page.',
                [{ text: 'OK', onPress: () => router.replace('/supplier/promote' as any) }]
              );
            } catch (e: any) {
              RNAlert.alert('Error', e?.message ?? 'Could not confirm payment');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Loading...</Text>
      </View>
    );
  }

  if (!placement) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader
          title="Payment"
          subtitle="Placement not found"
          icon={CreditCard}
          iconGradient={['#10B981', '#059669']}
          leftAction={
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centered}>
          <Text style={[styles.body, { color: theme.text.secondary }]}>This placement request was not found or you don't have access to it.</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]} onPress={() => router.replace('/supplier/promote' as any)}>
            <Text style={styles.primaryBtnText}>Back to Promote</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (placement.payment_status === 'paid') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader
          title="Payment"
          subtitle="Already paid"
          icon={CreditCard}
          iconGradient={['#10B981', '#059669']}
          leftAction={
            <TouchableOpacity onPress={() => router.replace('/supplier/promote' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
          }
        />
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.title, { color: theme.text.primary }]}>Payment complete</Text>
          <Text style={[styles.body, { color: theme.text.secondary }]}>
            This placement is {placement.status === 'pending_admin_approval' ? 'awaiting admin approval.' : 'processed.'}
          </Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]} onPress={() => router.replace('/supplier/promote' as any)}>
            <Text style={styles.primaryBtnText}>Back to Promote</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (placement.status !== 'pending_payment') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader
          title="Payment"
          subtitle="Invalid state"
          icon={CreditCard}
          iconGradient={['#10B981', '#059669']}
          leftAction={
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centered}>
          <Text style={[styles.body, { color: theme.text.secondary }]}>This placement is not awaiting payment.</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]} onPress={() => router.replace('/supplier/promote' as any)}>
            <Text style={styles.primaryBtnText}>Back to Promote</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const amount = Number(placement.price_amount ?? 0);
  const currency = placement.currency ?? 'USD';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Complete payment"
        subtitle="Sponsored placement"
        icon={CreditCard}
        iconGradient={['#10B981', '#059669']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.placementType, { color: theme.text.tertiary }]}>{placement.placement.replace(/_/g, ' ')}</Text>
          <Text style={[styles.dates, { color: theme.text.secondary }]}>
            {new Date(placement.starts_at).toLocaleDateString()} – {new Date(placement.ends_at).toLocaleDateString()}
          </Text>
          <View style={[styles.amountRow, { borderColor: theme.border.light }]}>
            <Text style={[styles.amountLabel, { color: theme.text.tertiary }]}>Amount due</Text>
            <Text style={[styles.amount, { color: theme.text.primary }]}>
              {currency} {amount.toFixed(2)}
            </Text>
          </View>
          <Text style={[styles.note, { color: theme.text.tertiary }]}>
            After payment is confirmed, your placement will be sent for admin approval. It will only go live once approved.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
            onPress={handleConfirmPayment}
            disabled={confirmPayment.isPending}
          >
            {confirmPayment.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Confirm payment</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md },
  title: { ...typography.sectionTitle, marginBottom: spacing.sm },
  placementType: { fontSize: 12, textTransform: 'capitalize', marginBottom: spacing.xxs },
  dates: { ...typography.bodySmall, marginBottom: spacing.md },
  amountRow: { borderTopWidth: 1, paddingTop: spacing.md, marginBottom: spacing.md },
  amountLabel: { ...typography.caption, marginBottom: spacing.xxs },
  amount: { fontSize: 24, fontWeight: '700' },
  note: { ...typography.caption, marginBottom: spacing.lg },
  primaryBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  body: { ...typography.bodySmall, marginBottom: spacing.md, textAlign: 'center' },
  loadingLabel: { marginTop: spacing.sm, ...typography.caption },
});
