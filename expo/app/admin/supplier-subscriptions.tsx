import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle, ExternalLink, Pause, Ban, RotateCcw, Tag, CreditCard, Building2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as RNAlert,
  Linking,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';
import { applyPromotionToSubscription, listPromotions } from '@/lib/promotion-engine';
import type { SubscriptionPromotion } from '@/types/promotion';

type SubscriptionRow = {
  id: string;
  supplier_profile_id: string;
  plan_id: string;
  status: string;
  start_date: string | null;
  expires_at: string | null;
  base_price: number | null;
  final_price: number | null;
  trial_ends_at: string | null;
  discount_ends_at: string | null;
  promotion_id: string | null;
  proof_of_payment_url: string | null;
  payment_reference: string | null;
  verification_notes: string | null;
  created_at: string;
  supplier_marketplace_profiles: { business_name: string; email: string; user_id: string } | null;
  supplier_subscription_plans: { name: string; duration_days: number; product_limit: number; price: number } | null;
};

const STATUS_FILTERS = ['pending_payment', 'active', 'trial', 'expired', 'all'] as const;

export default function AdminSupplierSubscriptionsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [list, setList] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('pending_payment');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});
  const [promotions, setPromotions] = useState<SubscriptionPromotion[]>([]);
  const [promoModalRowId, setPromoModalRowId] = useState<string | null>(null);
  const [promoModalForVerify, setPromoModalForVerify] = useState(false);
  const [promoForVerify, setPromoForVerify] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const STATUS_LABELS: Record<string, string> = {
    pending_payment: 'Pending',
    active: 'Active',
    trial: 'Trial',
    expired: 'Expired',
    suspended: 'Suspended',
    paused: 'Paused',
    cancelled: 'Cancelled',
  };
  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    pending_payment: { bg: '#FEF3C7', text: '#92400E' },
    active: { bg: '#D1FAE5', text: '#065F46' },
    trial: { bg: '#DBEAFE', text: '#1D4ED8' },
    expired: { bg: '#F3F4F6', text: '#6B7280' },
    suspended: { bg: '#FEE2E2', text: '#991B1B' },
    paused: { bg: '#E0E7FF', text: '#3730A3' },
    cancelled: { bg: '#F3F4F6', text: '#6B7280' },
  };

  const load = async () => {
    if (!refreshing) setLoading(true);
    const q = supabase
      .from('supplier_subscriptions')
      .select(
        'id, supplier_profile_id, plan_id, status, start_date, expires_at, base_price, final_price, trial_ends_at, discount_ends_at, promotion_id, proof_of_payment_url, payment_reference, verification_notes, created_at, supplier_marketplace_profiles(business_name, email, user_id), supplier_subscription_plans(name, duration_days, product_limit, price)'
      )
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      q.eq('status', statusFilter);
    }
    const { data, error } = await q;
    if (!error && data) {
      setList(data as SubscriptionRow[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    listPromotions(true).then(setPromotions).catch(() => setPromotions([]));
  }, []);

  const handleVerify = async (row: SubscriptionRow) => {
    const plan = row.supplier_subscription_plans;
    if (!user?.id || !plan) return;
    const promotionId = promoForVerify[row.id];

    setVerifyingId(row.id);
    try {
      if (promotionId) {
        const result = await applyPromotionToSubscription(row.id, promotionId);
        await supabase
          .from('supplier_subscriptions')
          .update({
            verified_by: user.id,
            verified_at: new Date().toISOString(),
            verification_notes: verificationNotes[row.id]?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        await supabase.from('supplier_admin_audit_log').insert({
          admin_user_id: user.id,
          action: 'subscription_verified',
          target_type: 'supplier_subscription',
          target_id: row.id,
          details: { plan_name: plan.name, promotion_id: promotionId, final_price: result.finalPrice },
        });

        const profile = row.supplier_marketplace_profiles;
        const expiresAt = result.trialEndsAt ? new Date(result.trialEndsAt) : new Date(result.discountEndsAt || '');
        if (profile?.user_id) {
          sendNotification({
            title: 'Subscription activated',
            message: `Your supplier subscription (${plan.name}) has been verified with a promotion and is now active.`,
            userId: profile.user_id,
          }).catch(() => {});
        }
        setPromoForVerify((prev) => ({ ...prev, [row.id]: '' }));
        RNAlert.alert('Done', `Subscription activated${result.status === 'trial' ? ' with trial' : ' with promotion'}.`);
      } else {
        const startDate = new Date();
        const expiresAt = new Date(startDate);
        expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

        const { error } = await supabase
          .from('supplier_subscriptions')
          .update({
            status: 'active',
            start_date: startDate.toISOString(),
            expires_at: expiresAt.toISOString(),
            verified_by: user.id,
            verified_at: new Date().toISOString(),
            verification_notes: verificationNotes[row.id]?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (error) throw error;

        await supabase.from('supplier_admin_audit_log').insert({
          admin_user_id: user.id,
          action: 'subscription_verified',
          target_type: 'supplier_subscription',
          target_id: row.id,
          details: { plan_name: plan.name, expires_at: expiresAt.toISOString() },
        });

        const profile = row.supplier_marketplace_profiles;
        if (profile?.user_id) {
          sendNotification({
            title: 'Subscription activated',
            message: `Your supplier subscription (${plan.name}) has been verified and is now active until ${expiresAt.toLocaleDateString()}.`,
            userId: profile.user_id,
          }).catch(() => {});
        }
        RNAlert.alert('Done', 'Subscription activated.');
      }

      setVerificationNotes((prev) => ({ ...prev, [row.id]: '' }));
      load();
    } catch (e: unknown) {
      RNAlert.alert('Error', (e as Error)?.message || 'Failed to verify');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAdminAction = async (
    row: SubscriptionRow,
    newStatus: 'cancelled' | 'suspended' | 'paused',
    actionLabel: string
  ) => {
    RNAlert.alert(`${actionLabel} subscription`, `Are you sure you want to ${actionLabel.toLowerCase()} this subscription?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: newStatus === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          if (!user?.id) return;
          setVerifyingId(row.id);
          try {
            const { error } = await supabase
              .from('supplier_subscriptions')
              .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', row.id);
            if (error) throw error;
            await supabase.from('supplier_admin_audit_log').insert({
              admin_user_id: user.id,
              action: `subscription_${newStatus}`,
              target_type: 'supplier_subscription',
              target_id: row.id,
              details: { previous_status: row.status },
            });
            const profile = row.supplier_marketplace_profiles;
            if (profile?.user_id) {
              sendNotification({
                title: `Subscription ${actionLabel}`,
                message: `Your supplier subscription has been ${actionLabel.toLowerCase()}d by admin.`,
                userId: profile.user_id,
              }).catch(() => {});
            }
            RNAlert.alert('Done', `Subscription ${actionLabel.toLowerCase()}d.`);
            load();
          } catch (e: any) {
            RNAlert.alert('Error', e?.message || `Failed to ${actionLabel.toLowerCase()}`);
          } finally {
            setVerifyingId(null);
          }
        },
      },
    ]);
  };

  const handleReactivate = async (row: SubscriptionRow) => {
    RNAlert.alert('Reactivate subscription', 'Restore this subscription to active?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reactivate',
        onPress: async () => {
          if (!user?.id) return;
          setVerifyingId(row.id);
          try {
            const plan = row.supplier_subscription_plans;
            const startDate = new Date();
            const expiresAt = plan ? new Date(startDate.getTime() + plan.duration_days * 24 * 60 * 60 * 1000) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            const { error } = await supabase
              .from('supplier_subscriptions')
              .update({
                status: 'active',
                start_date: startDate.toISOString(),
                expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', row.id);
            if (error) throw error;
            await supabase.from('supplier_admin_audit_log').insert({
              admin_user_id: user.id,
              action: 'subscription_reactivated',
              target_type: 'supplier_subscription',
              target_id: row.id,
              details: {},
            });
            RNAlert.alert('Done', 'Subscription reactivated.');
            load();
          } catch (e: any) {
            RNAlert.alert('Error', e?.message || 'Failed to reactivate');
          } finally {
            setVerifyingId(null);
          }
        },
      },
    ]);
  };

  const handleCancel = (row: SubscriptionRow) => handleAdminAction(row, 'cancelled', 'Cancel');

  const handleApplyPromotion = async (row: SubscriptionRow, promotionId: string) => {
    setVerifyingId(row.id);
    setPromoModalRowId(null);
    try {
      const result = await applyPromotionToSubscription(row.id, promotionId);
      const plan = row.supplier_subscription_plans;
      RNAlert.alert('Done', `Promotion applied. Final price: ${result.finalPrice}${plan?.price ? ` (was ${plan.price})` : ''}`);
      load();
    } catch (e: unknown) {
      RNAlert.alert('Error', (e as Error)?.message || 'Failed to apply promotion');
    } finally {
      setVerifyingId(null);
    }
  };

  const openPromoModal = (rowId: string, forVerify: boolean) => {
    setPromoModalRowId(rowId);
    setPromoModalForVerify(forVerify);
  };

  const onSelectPromotion = (promotionId: string) => {
    if (!promoModalRowId) return;
    if (promoModalForVerify) {
      setPromoForVerify((prev) => ({ ...prev, [promoModalRowId]: promotionId }));
      setPromoModalRowId(null);
    } else {
      const row = list.find((r) => r.id === promoModalRowId);
      if (row) handleApplyPromotion(row, promotionId);
    }
  };

  const clearPromoForVerify = (rowId: string) => setPromoForVerify((prev) => ({ ...prev, [rowId]: '' }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="Supplier Subscriptions"
        subtitle="Verify payments & apply promotions"
        showLogo={false}
        icon={CreditCard}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={() => router.push('/admin/subscription-promotions' as any)}>
            <Tag size={22} color={theme.accent.primary} />
          </TouchableOpacity>
        }
      />
      <View style={[styles.filterRow, { backgroundColor: theme.background.primary }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                statusFilter === f && {
                  borderBottomWidth: 3,
                  borderBottomColor: theme.accent.primary,
                  backgroundColor: 'transparent',
                },
              ]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === f ? theme.accent.primary : theme.text.secondary }]}>
                {STATUS_LABELS[f] || f.replace('_', ' ')}
              </Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent.primary} />}
        >
          {list.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.background.card }]}>
              <LinearGradient colors={['#0EA5E922', '#0EA5E908']} style={styles.emptyIconWrap}>
                <CreditCard size={56} color="#0EA5E9" strokeWidth={1.5} />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No subscriptions</Text>
              <Text style={[styles.emptySub, { color: theme.text.tertiary }]}>
                No subscriptions match this filter. Try selecting "All" to see everything.
              </Text>
            </View>
          ) : (
            list.map((row) => {
              const profile = row.supplier_marketplace_profiles;
              const plan = row.supplier_subscription_plans;
              const isVerifying = verifyingId === row.id;
              const statusStyle = STATUS_COLORS[row.status] || STATUS_COLORS.expired;
              return (
                <View key={row.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.businessIconWrap, { backgroundColor: theme.accent.primary + '18' }]}>
                      <Building2 size={22} color={theme.accent.primary} />
                    </View>
                    <View style={styles.cardTitleBlock}>
                      <Text style={[styles.businessName, { color: theme.text.primary }]}>{profile?.business_name ?? '—'}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{STATUS_LABELS[row.status] ?? row.status}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.planLabel, { color: theme.text.secondary }]}>{plan?.name ?? '—'}</Text>
                  <Text style={[styles.muted, { color: theme.text.tertiary }]}>Created {new Date(row.created_at).toLocaleDateString()}</Text>
                  {(row.base_price != null || row.final_price != null) && (
                    <Text style={[styles.priceRow, { color: theme.text.secondary }]}>
                      {row.final_price != null && `${row.final_price}`}
                      {row.base_price != null && row.final_price !== row.base_price && (
                        <Text style={{ textDecorationLine: 'line-through', marginLeft: 6 }}>{row.base_price}</Text>
                      )}
                    </Text>
                  )}
                  {row.promotion_id && (
                    <View style={[styles.promoBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                      <Tag size={12} color={theme.accent.primary} />
                      <Text style={[styles.promoBadgeText, { color: theme.accent.primary }]}>
                        Promotion · {row.final_price != null ? `${row.final_price}` : ''}{row.trial_ends_at ? ` · Trial to ${new Date(row.trial_ends_at).toLocaleDateString()}` : ''}{row.discount_ends_at ? ` · Discount to ${new Date(row.discount_ends_at).toLocaleDateString()}` : ''}
                      </Text>
                    </View>
                  )}
                  {row.status === 'pending_payment' && (
                    <>
                      {row.proof_of_payment_url && (
                        <TouchableOpacity
                          style={styles.linkRow}
                          onPress={() => row.proof_of_payment_url && Linking.openURL(row.proof_of_payment_url)}
                        >
                          <ExternalLink size={16} color={theme.accent.primary} />
                          <Text style={[styles.linkText, { color: theme.accent.primary }]}>View proof of payment</Text>
                        </TouchableOpacity>
                      )}
                      {row.payment_reference && (
                        <Text style={[styles.muted, { color: theme.text.tertiary }]}>Reference: {row.payment_reference}</Text>
                      )}
                      <TextInput
                        style={[styles.notesInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="Verification notes (optional)"
                        placeholderTextColor={theme.text.tertiary}
                        value={verificationNotes[row.id] ?? ''}
                        onChangeText={(t) => setVerificationNotes((prev) => ({ ...prev, [row.id]: t }))}
                      />
                      <View style={styles.promoRow}>
                        <TouchableOpacity style={[styles.promoSelectBtn, { backgroundColor: theme.background.secondary }]} onPress={() => openPromoModal(row.id, true)}>
                          <Tag size={16} color={theme.accent.primary} />
                          <Text style={[styles.promoSelectText, { color: promoForVerify[row.id] ? theme.accent.primary : theme.text.secondary }]}>
                            {promoForVerify[row.id] ? promotions.find((p) => p.id === promoForVerify[row.id])?.name ?? 'Promotion selected' : 'Apply promotion (optional)'}
                          </Text>
                        </TouchableOpacity>
                        {promoForVerify[row.id] && (
                          <TouchableOpacity onPress={() => clearPromoForVerify(row.id)}>
                            <Text style={[styles.clearPromoText, { color: theme.text.tertiary }]}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}
                          onPress={() => handleVerify(row)}
                          disabled={isVerifying}
                        >
                          {isVerifying ? <ActivityIndicator size="small" color="#065F46" /> : <CheckCircle size={18} color="#065F46" />}
                          <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Verify & activate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleCancel(row)} disabled={isVerifying}>
                          <XCircle size={18} color="#991B1B" />
                          <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {(row.status === 'active' || row.status === 'trial') && row.expires_at && (
                    <>
                      <Text style={[styles.muted, { color: theme.text.tertiary }]}>Expires {new Date(row.expires_at).toLocaleDateString()}</Text>
                      <View style={[styles.actions, { marginTop: 12 }]}>
                        {!row.promotion_id && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => openPromoModal(row.id, false)} disabled={verifyingId === row.id}>
                            {verifyingId === row.id ? <ActivityIndicator size="small" color="#065F46" /> : <Tag size={18} color="#065F46" />}
                            <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Apply promotion</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleAdminAction(row, 'cancelled', 'Cancel')} disabled={verifyingId === row.id}>
                          {verifyingId === row.id ? <ActivityIndicator size="small" color="#991B1B" /> : <XCircle size={18} color="#991B1B" />}
                          <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]} onPress={() => handleAdminAction(row, 'suspended', 'Suspend')} disabled={verifyingId === row.id}>
                          <Ban size={18} color="#92400E" />
                          <Text style={[styles.actionBtnText, { color: '#92400E' }]}>Suspend</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E0E7FF' }]} onPress={() => handleAdminAction(row, 'paused', 'Pause')} disabled={verifyingId === row.id}>
                          <Pause size={18} color="#3730A3" />
                          <Text style={[styles.actionBtnText, { color: '#3730A3' }]}>Pause</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {row.status === 'expired' && (
                    <Text style={[styles.muted, { color: theme.text.tertiary }]}>Expired {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : ''}</Text>
                  )}
                  {(row.status === 'suspended' || row.status === 'paused') && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5', marginTop: 12 }]} onPress={() => handleReactivate(row)} disabled={verifyingId === row.id}>
                      {verifyingId === row.id ? <ActivityIndicator size="small" color="#065F46" /> : <RotateCcw size={18} color="#065F46" />}
                      <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Reactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={!!promoModalRowId} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPromoModalRowId(null)} />
          <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border?.light || '#E5E7EB' }]}>
              <Tag size={24} color={theme.accent.primary} />
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {promoModalForVerify ? 'Apply promotion when verifying' : 'Apply promotion'}
              </Text>
            </View>
            <Text style={[styles.modalSub, { color: theme.text.secondary }]}>
              {promotions.length === 0 ? 'No active promotions. Create one in Subscription Promotions.' : 'Select a promotion:'}
            </Text>
            <ScrollView style={styles.promoList} contentContainerStyle={styles.promoListContent}>
              {promotions.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.promoItem, { backgroundColor: theme.background.secondary }]}
                  onPress={() => onSelectPromotion(p.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.promoItemIcon, { backgroundColor: theme.accent.primary + '18' }]}>
                    <Tag size={18} color={theme.accent.primary} />
                  </View>
                  <View style={styles.promoItemBody}>
                    <Text style={[styles.promoItemName, { color: theme.text.primary }]}>{p.name}</Text>
                    <Text style={[styles.promoItemDetail, { color: theme.text.tertiary }]}>
                      {p.type === 'free_trial' && `${p.trialDays} days trial`}
                      {p.type === 'percentage_discount' && `${p.discountPercent}% off`}
                      {p.type === 'fixed_discount' && `${p.currency} ${p.discountAmount} off`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCancel, { backgroundColor: theme.background.secondary }]} onPress={() => setPromoModalRowId(null)}>
              <Text style={[styles.modalCancelText, { color: theme.text.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
  filterContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 10 },
  filterChipText: { fontSize: 15, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  emptyCard: { alignItems: 'center', padding: 40, borderRadius: 24, marginTop: 20 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  card: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  businessIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTitleBlock: { flex: 1, gap: 8 },
  businessName: { fontSize: 17, fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  planLabel: { fontSize: 14, marginBottom: 4 },
  priceRow: { fontSize: 13, marginTop: 4 },
  muted: { fontSize: 13, marginTop: 2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  linkText: { fontSize: 14 },
  notesInput: { marginTop: 8, padding: 10, borderRadius: 8, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionBtnText: { fontWeight: '600', fontSize: 14 },
  promoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  promoBadgeText: { fontSize: 12, fontWeight: '600' },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  promoSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, flex: 1 },
  promoSelectText: { fontSize: 14, fontWeight: '500' },
  clearPromoText: { fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, marginBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  modalSub: { fontSize: 14, marginBottom: 16 },
  promoList: { maxHeight: 280 },
  promoListContent: { gap: 10, paddingBottom: 16 },
  promoItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14 },
  promoItemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  promoItemBody: { flex: 1 },
  promoItemName: { fontSize: 16, fontWeight: '600' },
  promoItemDetail: { fontSize: 13, marginTop: 4 },
  modalCancel: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalCancelText: { fontWeight: '600', fontSize: 15 },
});
