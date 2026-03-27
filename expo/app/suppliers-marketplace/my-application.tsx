import { useRouter } from 'expo-router';
import { FileText, ArrowLeft, CheckCircle, XCircle, Clock, MessageCircle, Edit3, LayoutDashboard, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert as RNAlert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { useQueryClient } from '@tanstack/react-query';
import { useMySupplierApplication, useReapplySupplierApplication, useWithdrawSupplierApplication } from '@/hooks/useSupplierApplication';
import type { SupplierApplicationStatus } from '@/hooks/useSupplierApplication';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';

const STATUS_LABELS: Record<SupplierApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending: 'Pending review',
  needs_info: 'More info needed',
  approved: 'Approved',
  declined: 'Declined',
};

const STATUS_BADGE_STYLE: Record<SupplierApplicationStatus, { bg: string; text: string }> = {
  draft: { bg: '#F1F5F9', text: '#64748B' },
  submitted: { bg: '#EFF6FF', text: '#2563EB' },
  pending: { bg: '#FEF3C7', text: '#B45309' },
  needs_info: { bg: '#FEF3C7', text: '#B45309' },
  approved: { bg: '#ECFDF5', text: '#059669' },
  declined: { bg: '#FEF2F2', text: '#DC2626' },
};

export default function MyApplicationScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: application, isLoading, isFetching, refetch } = useMySupplierApplication(user?.id);
  const reapplyMutation = useReapplySupplierApplication(user?.id);
  const withdrawMutation = useWithdrawSupplierApplication(user?.id);
  const [acting, setActing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['supplier-flow-state'] });
    setRefreshing(false);
  };

  const canAccess = isFeatureVisible('supplier-marketplace');
  if (!canAccess) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>Access not available.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Loading application...</Text>
      </View>
    );
  }

  if (!user?.id) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary, padding: spacing.lg }]}>
        <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Sign in required</Text>
        <Text style={[styles.emptyBody, { color: theme.text.secondary }]}>Sign in to view your supplier application.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent.primary, marginTop: spacing.lg }]} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <PageHeader
          title="My Application"
          subtitle="Supplier application"
          icon={FileText}
          iconGradient={['#0EA5E9', '#0284C7']}
          leftAction={
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <ArrowLeft size={24} color={theme.text.inverse} />
            </TouchableOpacity>
          }
        />
        <View style={styles.scrollContent}>
          <View style={[styles.card, styles.cardElevated, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No application yet</Text>
            <Text style={[styles.emptyBody, { color: theme.text.secondary }]}>
              Start your supplier application to get approved and list products on the marketplace.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
              onPress={() => router.replace('/suppliers-marketplace/become-a-supplier' as any)}
            >
              <FileText size={20} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.primaryBtnText}>Start application</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const status = application.status as SupplierApplicationStatus;
  const badgeStyle = STATUS_BADGE_STYLE[status] || STATUS_BADGE_STYLE.draft;
  const requestedFields = Array.isArray(application.admin_requested_fields) ? application.admin_requested_fields : [];
  const submittedAt = application.submitted_at ? new Date(application.submitted_at).toLocaleString() : null;
  const reviewedAt = application.reviewed_at ? new Date(application.reviewed_at).toLocaleString() : null;

  const handleReapply = async () => {
    setActing(true);
    try {
      await reapplyMutation.mutateAsync(application.id);
      refetch();
      RNAlert.alert('', 'You can now edit and resubmit your application.', [
        { text: 'OK', onPress: () => router.replace('/suppliers-marketplace/become-a-supplier' as any) },
      ]);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not start re-application.');
    } finally {
      setActing(false);
    }
  };

  const handleWithdraw = () => {
    RNAlert.alert('Withdraw application', 'Your application will return to draft. You can edit and submit again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        onPress: async () => {
          setActing(true);
          try {
            await withdrawMutation.mutateAsync(application.id);
            refetch();
            RNAlert.alert('', 'Application withdrawn. You can edit and submit again.', [
              { text: 'OK', onPress: () => router.replace('/suppliers-marketplace/become-a-supplier' as any) },
            ]);
          } catch (e: any) {
            RNAlert.alert('Error', e?.message || 'Could not withdraw.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title="My Application"
        subtitle={application.display_name || 'Supplier application'}
        icon={FileText}
        iconGradient={['#0EA5E9', '#0284C7']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || isFetching} onRefresh={onRefresh} colors={[theme.accent.primary]} />
        }
      >
        <View style={[styles.card, styles.cardElevated, { backgroundColor: theme.background.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={[styles.overline, { color: theme.text.tertiary }]}>Status</Text>
            <TouchableOpacity onPress={onRefresh} disabled={refreshing || isFetching} hitSlop={12}>
              <RefreshCw size={20} color={theme.accent.primary} style={{ opacity: refreshing || isFetching ? 0.6 : 1 }} />
            </TouchableOpacity>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.statusText, { color: badgeStyle.text }]}>{STATUS_LABELS[status] || status}</Text>
          </View>
          {submittedAt && (
            <>
              <Text style={[styles.overline, { color: theme.text.tertiary }]}>Submitted</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{submittedAt}</Text>
            </>
          )}
          {reviewedAt && (
            <>
              <Text style={[styles.overline, { color: theme.text.tertiary }]}>Reviewed</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{reviewedAt}</Text>
            </>
          )}
          {application.admin_note ? (
            <>
              <Text style={[styles.overline, { color: theme.text.tertiary }]}>Admin note</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{application.admin_note}</Text>
            </>
          ) : null}
          {requestedFields.length > 0 && (
            <>
              <Text style={[styles.overline, { color: theme.text.tertiary }]}>Requested information</Text>
              <Text style={[styles.value, { color: theme.text.primary }]}>{requestedFields.join(', ')}</Text>
            </>
          )}
        </View>

        <View style={[styles.card, styles.cardElevated, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Actions</Text>
          {status === 'draft' && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
              onPress={() => router.replace('/suppliers-marketplace/become-a-supplier' as any)}
              activeOpacity={0.85}
            >
              <Edit3 size={20} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.primaryBtnText}>Continue & Submit</Text>
            </TouchableOpacity>
          )}
          {(status === 'submitted' || status === 'pending') && (
            <>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: theme.accent.primary }]}
                onPress={() => router.replace('/suppliers-marketplace/become-a-supplier' as any)}
                activeOpacity={0.85}
              >
                <FileText size={20} color={theme.accent.primary} strokeWidth={2.5} />
                <Text style={[styles.secondaryBtnText, { color: theme.accent.primary }]}>View application</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: theme.border.medium }, styles.secondaryBtnSpaced]}
                onPress={handleWithdraw}
                disabled={acting}
                activeOpacity={0.85}
              >
                {acting ? <ActivityIndicator size="small" color={theme.text.tertiary} /> : <Clock size={20} color={theme.text.tertiary} strokeWidth={2} />}
                <Text style={[styles.secondaryBtnText, { color: theme.text.secondary }]}>Withdraw (return to draft)</Text>
              </TouchableOpacity>
            </>
          )}
          {status === 'needs_info' && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
              onPress={() => router.replace('/suppliers-marketplace/become-a-supplier' as any)}
              activeOpacity={0.85}
            >
              <MessageCircle size={20} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.primaryBtnText}>Update & Resubmit</Text>
            </TouchableOpacity>
          )}
          {status === 'declined' && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent.primary }]}
              onPress={handleReapply}
              disabled={acting}
              activeOpacity={0.85}
            >
              {acting ? <ActivityIndicator size="small" color="#FFF" /> : <Edit3 size={20} color="#FFF" strokeWidth={2.5} />}
              <Text style={styles.primaryBtnText}>Edit & Re-apply</Text>
            </TouchableOpacity>
          )}
          {status === 'approved' && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.accent.success }]}
              onPress={() => router.replace('/supplier' as any)}
              activeOpacity={0.85}
            >
              <LayoutDashboard size={20} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.primaryBtnText}>Go to Supplier Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { padding: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.md },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.md },
  overline: { ...typography.overline, marginTop: spacing.md, marginBottom: spacing.xxs },
  value: { ...typography.bodySmall, marginBottom: spacing.xxs },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  statusText: { fontWeight: '600', fontSize: 14 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minHeight: minTouchTarget,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    minHeight: minTouchTarget,
  },
  secondaryBtnSpaced: { marginTop: spacing.xs },
  secondaryBtnText: { fontWeight: '600', fontSize: 15 },
  loadingLabel: { marginTop: spacing.sm, ...typography.caption },
  emptyTitle: { ...typography.sectionTitle, marginBottom: spacing.xs, textAlign: 'center' },
  emptyBody: { ...typography.bodySmall, textAlign: 'center', paddingHorizontal: spacing.lg },
});
