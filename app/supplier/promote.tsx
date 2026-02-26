import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Megaphone,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Star,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  Modal,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  useSupplierPlacements,
  useCreateSponsoredPlacement,
  usePlacementPricing,
  type PlacementType,
  type PlacementPricingTier,
  type SponsoredPlacement,
} from '@/hooks/useSponsoredPlacements';
import { spacing, radius, typography, minTouchTarget, contentMaxWidth } from '@/constants/layout';

const PLACEMENT_TYPE_MAP: Record<string, PlacementType> = {
  homepage_featured: 'homepage_featured',
  feed_featured: 'feed_featured',
  category_featured: 'category_featured',
  home: 'home',
  category: 'category',
  search: 'search',
  profile: 'profile',
};

function StatusBadge({ status, paymentStatus }: { status: string; paymentStatus: string }) {
  const { theme } = useTheme();
  const isTertiary = ['expired', 'cancelled', 'paused'].includes(status);
  const configs: Record<string, { bg: string; label: string; icon: typeof CreditCard }> = {
    pending_payment: { bg: theme.surface.warning, label: 'Payment required', icon: CreditCard },
    pending_admin_approval: { bg: theme.surface.info, label: 'Pending approval', icon: Clock },
    approved: { bg: theme.surface.success, label: 'Approved', icon: CheckCircle },
    active: { bg: theme.surface.success, label: 'Active', icon: CheckCircle },
    rejected: { bg: theme.surface.danger, label: 'Rejected', icon: XCircle },
    expired: { bg: theme.background.tertiary, label: 'Expired', icon: AlertCircle },
    cancelled: { bg: theme.background.tertiary, label: 'Cancelled', icon: AlertCircle },
    paused: { bg: theme.background.tertiary, label: 'Paused', icon: AlertCircle },
  };
  const config = configs[status] ?? configs.pending_payment;
  const isPaymentRequired = status === 'pending_payment' || paymentStatus === 'unpaid';
  const Icon = config.icon;
  const textColor = isTertiary ? theme.text.secondary : theme.text.inverse;
  const iconColor = isTertiary ? theme.text.secondary : theme.text.inverse;
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Icon size={14} color={iconColor} />
      <Text style={[styles.statusBadgeText, { color: textColor }]}>{isPaymentRequired ? 'Payment required' : config.label}</Text>
    </View>
  );
}

export default function SupplierPromoteScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PlacementPricingTier | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('supplier_marketplace_profiles').select('id').eq('user_id', user.id).eq('status', 'approved').maybeSingle().then(({ data }) => setProfileId(data?.id ?? null));
  }, [user?.id]);

  const { data: placements = [], isLoading } = useSupplierPlacements(profileId ?? undefined);
  const { data: pricingTiers = [], isLoading: pricingLoading } = usePlacementPricing();
  const createPlacement = useCreateSponsoredPlacement(profileId ?? undefined);

  const openCreate = (tier: PlacementPricingTier) => {
    setSelectedTier(tier);
    setModalOpen(true);
  };

  const submitCreate = async () => {
    if (!selectedTier || !profileId) return;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + selectedTier.duration_days);
    const placement = (PLACEMENT_TYPE_MAP[selectedTier.placement_type] ?? selectedTier.placement_type) as PlacementType;
    try {
      const created = await createPlacement.mutateAsync({
        placement,
        placement_type: selectedTier.placement_type,
        price_amount: selectedTier.price,
        currency: selectedTier.currency,
        duration_days: selectedTier.duration_days,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      });
      setModalOpen(false);
      setSelectedTier(null);
      RNAlert.alert('Request created', 'Complete payment to submit for admin approval.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay now', onPress: () => router.push(`/supplier/promote-pay/${created.id}` as any) },
      ]);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not create request.');
    }
  };

  if (!profileId && !isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Supplier profile not found.</Text>
      </View>
    );
  }

  const pendingPayment = placements.filter((p) => p.status === 'pending_payment' && p.payment_status !== 'paid');
  const pendingApproval = placements.filter((p) => p.status === 'pending_admin_approval');
  const activeOrApproved = placements.filter((p) => p.status === 'approved' || p.status === 'active');
  const rejected = placements.filter((p) => p.status === 'rejected');
  const other = placements.filter(
    (p) => !['pending_payment', 'pending_admin_approval', 'approved', 'active', 'rejected'].includes(p.status)
  );

  const contentWidth = Math.min(width - spacing.md * 2, contentMaxWidth + spacing.xl);
  const isNarrow = width < 400;
  const cardLayout = isNarrow ? 'column' : 'row';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Promote"
        subtitle="Paid sponsored placements · Admin approval required"
        icon={Megaphone}
        iconGradient={['#EC4899', '#DB2777']}
        showLogo={false}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />

      {isLoading || pricingLoading ? (
        <View style={[styles.centered, styles.loadingBlock]}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contain, { width: contentWidth, alignSelf: 'center' }]}>
            {/* Hero */}
            <View style={[styles.hero, { backgroundColor: theme.background.card }]}>
              <View style={[styles.heroIconWrap, { backgroundColor: theme.surface.info }]}>
                <Sparkles size={28} color={theme.accent.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: theme.text.primary }]}>Promote Your Products</Text>
              <Text style={[styles.heroSub, { color: theme.text.secondary }]}>
                Get featured in the marketplace. Choose a placement, complete payment, and your request is sent for admin approval. Placements go live only after approval.
              </Text>
            </View>

            {/* How it works */}
            <View style={[styles.section, { marginTop: spacing.lg }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>How it works</Text>
              <View style={[styles.benefitsList, { backgroundColor: theme.background.card }]}>
                <View style={styles.benefitRow}>
                  <View style={[styles.benefitDot, { backgroundColor: theme.accent.primary }]} />
                  <Text style={[styles.benefitText, { color: theme.text.secondary }]}>Choose a placement tier below</Text>
                </View>
                <View style={styles.benefitRow}>
                  <View style={[styles.benefitDot, { backgroundColor: theme.accent.primary }]} />
                  <Text style={[styles.benefitText, { color: theme.text.secondary }]}>Complete payment</Text>
                </View>
                <View style={styles.benefitRow}>
                  <View style={[styles.benefitDot, { backgroundColor: theme.accent.primary }]} />
                  <Text style={[styles.benefitText, { color: theme.text.secondary }]}>Admin reviews and approves</Text>
                </View>
                <View style={styles.benefitRow}>
                  <View style={[styles.benefitDot, { backgroundColor: theme.accent.primary }]} />
                  <Text style={[styles.benefitText, { color: theme.text.secondary }]}>Your placement goes live for the duration</Text>
                </View>
              </View>
            </View>

            {/* Pricing cards - 100% from backend */}
            <View style={[styles.section, { marginTop: spacing.xl }]}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Placement options</Text>
              <Text style={[styles.sectionSub, { color: theme.text.tertiary }]}>Select a tier to request. Only active tiers configured by admin are shown.</Text>
              {pricingTiers.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.background.card }]}>
                  <Megaphone size={40} color={theme.text.tertiary} />
                  <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No placement tiers available</Text>
                  <Text style={[styles.emptySub, { color: theme.text.secondary }]}>Placement options are configured by admin. Contact support to enable promotions.</Text>
                </View>
              ) : (
                <View style={[styles.cardsRow, cardLayout === 'column' && styles.cardsColumn]}>
                  {pricingTiers.map((tier) => (
                    <TouchableOpacity
                      key={tier.id}
                      activeOpacity={0.85}
                      onPress={() => openCreate(tier)}
                      style={[
                        styles.premiumCard,
                        {
                          backgroundColor: theme.background.card,
                          borderColor: tier.highlight_flag ? theme.accent.primary : theme.border.light,
                          borderWidth: tier.highlight_flag ? 2 : 1,
                          width: cardLayout === 'column' ? '100%' : undefined,
                          flex: cardLayout === 'row' ? 1 : undefined,
                          minWidth: cardLayout === 'row' ? 160 : undefined,
                        },
                      ]}
                    >
                      {tier.highlight_flag && (
                        <View style={[styles.recommendedBadge, { backgroundColor: theme.accent.primary }]}>
                          <Star size={12} color="#FFF" />
                          <Text style={styles.recommendedText}>Recommended</Text>
                        </View>
                      )}
                      <Text style={[styles.cardName, { color: theme.text.primary }]}>{tier.label}</Text>
                      {tier.description ? (
                        <Text style={[styles.cardDesc, { color: theme.text.secondary }]} numberOfLines={2}>{tier.description}</Text>
                      ) : null}
                      <View style={[styles.priceWrap, { borderTopColor: theme.border.light }]}>
                        <Text style={[styles.priceAmount, { color: theme.accent.primary }]}>
                          {tier.currency} {Number(tier.price).toFixed(0)}
                        </Text>
                        <Text style={[styles.priceMeta, { color: theme.text.tertiary }]}>{tier.duration_days} days</Text>
                      </View>
                      {(tier.benefits?.length ?? 0) > 0 && (
                        <View style={styles.bullets}>
                          {(tier.benefits || []).slice(0, 4).map((b, i) => (
                            <View key={i} style={styles.bulletRow}>
                              <Text style={[styles.bullet, { color: theme.accent.primary }]}>•</Text>
                              <Text style={[styles.bulletText, { color: theme.text.secondary }]} numberOfLines={1}>{b}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <View style={[styles.cardCta, { backgroundColor: theme.accent.primary }]}>
                        <Text style={styles.cardCtaText}>Request placement</Text>
                        <ChevronRight size={18} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Your placements */}
            {placements.length > 0 && (
              <View style={[styles.section, { marginTop: spacing.xl }]}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Your placements</Text>
                {pendingPayment.map((p) => (
                  <PlacementCard key={p.id} placement={p} theme={theme} onPay={() => router.push(`/supplier/promote-pay/${p.id}` as any)} />
                ))}
                {pendingApproval.map((p) => (
                  <PlacementCard key={p.id} placement={p} theme={theme} />
                ))}
                {activeOrApproved.map((p) => (
                  <PlacementCard key={p.id} placement={p} theme={theme} />
                ))}
                {rejected.map((p) => (
                  <PlacementCard key={p.id} placement={p} theme={theme} showRejection />
                ))}
                {other.map((p) => (
                  <PlacementCard key={p.id} placement={p} theme={theme} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Request sponsored placement</Text>
            {selectedTier && (
              <>
                <Text style={[styles.modalTierName, { color: theme.accent.primary }]}>{selectedTier.label}</Text>
                <Text style={[styles.modalPrice, { color: theme.text.primary }]}>
                  {selectedTier.currency} {Number(selectedTier.price).toFixed(2)} for {selectedTier.duration_days} days
                </Text>
                <Text style={[styles.modalNote, { color: theme.text.tertiary }]}>
                  You will be redirected to complete payment. After payment, your request is sent for admin approval. The placement goes live only when approved.
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]}
                    onPress={() => { setModalOpen(false); setSelectedTier(null); }}
                  >
                    <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: theme.accent.primary }]}
                    onPress={submitCreate}
                    disabled={createPlacement.isPending}
                  >
                    {createPlacement.isPending ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Continue to payment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PlacementCard({
  placement,
  theme,
  onPay,
  showRejection,
}: {
  placement: SponsoredPlacement;
  theme: any;
  onPay?: () => void;
  showRejection?: boolean;
}) {
  return (
    <View style={[styles.placementCard, { backgroundColor: theme.background.card }]}>
      <View style={styles.placementCardHeader}>
        <Text style={[styles.placementCardName, { color: theme.text.primary }]}>{placement.placement.replace(/_/g, ' ')}</Text>
        <StatusBadge status={placement.status} paymentStatus={placement.payment_status} />
      </View>
      <Text style={[styles.placementCardDates, { color: theme.text.secondary }]}>
        {new Date(placement.starts_at).toLocaleDateString()} – {new Date(placement.ends_at).toLocaleDateString()}
      </Text>
      {placement.status === 'pending_payment' && (
        <Text style={[styles.placementCardMeta, { color: theme.text.tertiary }]}>
          {placement.currency ?? 'USD'} {Number(placement.price_amount ?? 0).toFixed(2)} · Payment required to continue
        </Text>
      )}
      {placement.status === 'pending_admin_approval' && (
        <Text style={[styles.placementCardMeta, { color: theme.text.tertiary }]}>Awaiting admin approval. You will be notified when reviewed.</Text>
      )}
      {(placement.status === 'approved' || placement.status === 'active') && (
        <Text style={[styles.placementCardMeta, { color: theme.text.tertiary }]}>
          {placement.status === 'approved' ? 'Approved; visible in marketplace within the date range.' : 'Active in marketplace.'}
        </Text>
      )}
      {showRejection && placement.rejected_reason && (
        <Text style={[styles.rejectedReason, { color: theme.text.secondary }]}>Reason: {placement.rejected_reason}</Text>
      )}
      {onPay && (placement.status === 'pending_payment' || placement.payment_status !== 'paid') && (
        <TouchableOpacity style={[styles.payBtn, { backgroundColor: theme.accent.primary }]} onPress={onPay}>
          <Text style={styles.payBtnText}>Pay now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingBlock: { paddingVertical: spacing.xxl },
  loadingLabel: { marginTop: spacing.sm, ...typography.caption },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md },
  contain: { paddingHorizontal: spacing.xs },
  hero: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
    ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 } : {}),
  },
  heroIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  heroTitle: { ...typography.pageTitle, fontSize: 24, textAlign: 'center', marginBottom: spacing.xs },
  heroSub: { ...typography.bodySmall, textAlign: 'center', maxWidth: 360 },
  section: {},
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.xxs },
  sectionSub: { ...typography.caption, marginBottom: spacing.md },
  benefitsList: { padding: spacing.md, borderRadius: radius.lg },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  benefitDot: { width: 6, height: 6, borderRadius: 3, marginRight: spacing.sm },
  benefitText: { fontSize: 14, flex: 1 },
  emptyState: { padding: spacing.xl, borderRadius: radius.lg, alignItems: 'center' },
  emptyTitle: { ...typography.cardTitle, marginTop: spacing.sm, marginBottom: spacing.xs },
  emptySub: { ...typography.caption, textAlign: 'center' },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cardsColumn: { flexDirection: 'column' },
  premiumCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...(Platform.OS === 'android' ? { elevation: 3 } : {}),
    ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 12 } : {}),
  },
  recommendedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, marginBottom: spacing.sm },
  recommendedText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  cardName: { ...typography.cardTitle, marginBottom: spacing.xxs },
  cardDesc: { ...typography.caption, marginBottom: spacing.sm },
  priceWrap: { borderTopWidth: 1, paddingTop: spacing.sm, marginBottom: spacing.sm },
  priceAmount: { fontSize: 28, fontWeight: '800' },
  priceMeta: { fontSize: 13, marginTop: 2 },
  bullets: { marginBottom: spacing.md },
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  bullet: { marginRight: 6, fontSize: 14 },
  bulletText: { fontSize: 13, flex: 1 },
  cardCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm, borderRadius: radius.md },
  cardCtaText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  placementCard: { padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm },
  placementCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  placementCardName: { ...typography.cardTitle, fontSize: 16, textTransform: 'capitalize' },
  placementCardDates: { fontSize: 13, marginTop: 4 },
  placementCardMeta: { fontSize: 12, marginTop: 4 },
  rejectedReason: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  payBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  payBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalBox: { width: '100%', maxWidth: 400, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { ...typography.sectionTitle, marginBottom: spacing.md },
  modalTierName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  modalPrice: { fontSize: 22, fontWeight: '700', marginBottom: spacing.sm },
  modalNote: { ...typography.caption, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', minHeight: minTouchTarget, justifyContent: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
});
