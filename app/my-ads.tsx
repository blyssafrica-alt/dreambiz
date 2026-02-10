import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert as RNAlert, Modal, TextInput, Switch } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabase';
import type { Advertisement } from '@/types/super-admin';
import { ArrowLeft, RefreshCcw, Pause, Play, Trash2, Edit, Eye, MousePointerClick, TrendingUp, DollarSign, BarChart3, Users, Calendar, MapPin, ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';

export default function MyAdsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { settings, updateRemoveProofConfirmPreference } = useSettings();
  const router = useRouter();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [adSetsById, setAdSetsById] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [editHeadline, setEditHeadline] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editReference, setEditReference] = useState('');
  const [editAutoRenew, setEditAutoRenew] = useState(false);
  const [editMode, setEditMode] = useState<'resubmit' | 'renew'>('resubmit');
  const [editPaymentProofUrl, setEditPaymentProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [editProofDirty, setEditProofDirty] = useState(false);
  const [analyticsAd, setAnalyticsAd] = useState<Advertisement | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const formatExpiry = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  };
  const loadAds = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setAds(data.map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          type: row.type,
          imageUrl: row.image_url,
          videoUrl: row.video_url,
          thumbnailUrl: row.thumbnail_url,
          headline: row.headline,
          bodyText: row.body_text,
          ctaText: row.cta_text || 'Learn More',
          ctaUrl: row.cta_url,
          ctaAction: row.cta_action,
          ctaTargetId: row.cta_target_id,
          targeting: row.targeting || {},
          placement: row.placement || {},
          spend: row.spend ? parseFloat(row.spend) : undefined,
          spendCurrency: row.spend_currency || 'USD',
          adSetId: row.ad_set_id || undefined,
          paymentStatus: row.payment_status || undefined,
          paymentAmount: row.payment_amount ? parseFloat(row.payment_amount) : undefined,
          paymentCurrency: row.payment_currency || 'USD',
          paymentReference: row.payment_reference || undefined,
          paymentProofUrl: row.payment_proof_url || undefined,
          startDate: row.start_date,
          endDate: row.end_date,
          autoRenew: row.auto_renew || false,
          timezone: row.timezone || 'Africa/Harare',
          status: row.status,
          impressionsCount: row.impressions_count || 0,
          clicksCount: row.clicks_count || 0,
          conversionsCount: row.conversions_count || 0,
          spendActual: row.spend_actual !== null && row.spend_actual !== undefined ? parseFloat(row.spend_actual) : undefined,
          revenue: row.revenue !== null && row.revenue !== undefined ? parseFloat(row.revenue) : undefined,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      } else {
        setAds([]);
      }
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to load ads');
      setAds([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadAdSets = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const [{ data }, { data: dailySpendData }] = await Promise.all([
      supabase.from('ad_sets').select('*'),
      supabase.from('ad_set_daily_spend').select('ad_set_id, spend_amount').eq('spend_date', today),
    ]);

    const dailySpendMap: Record<string, number> = {};
    (dailySpendData || []).forEach((row: any) => {
      if (row.ad_set_id) {
        dailySpendMap[row.ad_set_id] = row.spend_amount !== null && row.spend_amount !== undefined ? parseFloat(row.spend_amount) : 0;
      }
    });

    const adSetMap: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      adSetMap[row.id] = {
        id: row.id,
        name: row.name,
        pacingEnabled: row.pacing_enabled || false,
        dailyBudget: row.daily_budget !== null && row.daily_budget !== undefined ? parseFloat(row.daily_budget) : undefined,
        spendActualToday: dailySpendMap[row.id] ?? 0,
        optimizationGoal: row.optimization_goal || 'impressions',
        learningEventThreshold: row.learning_event_threshold ?? 50,
        currency: row.currency || 'USD',
      };
    });

    setAdSetsById(adSetMap);
  }, []);

  const openEditModal = (ad: Advertisement, mode: 'resubmit' | 'renew' = 'resubmit') => {
    setEditingAd(ad);
    setEditMode(mode);
    setEditHeadline(ad.headline || '');
    setEditBody(ad.bodyText || '');
    setEditCta(ad.ctaText || 'Learn More');
    setEditReference(ad.paymentReference || '');
    setEditAutoRenew(mode === 'renew' ? true : Boolean(ad.autoRenew));
    setEditPaymentProofUrl(ad.paymentProofUrl || null);
    setEditProofDirty(false);
  };

  const handleResubmit = async () => {
    if (!editingAd || !user) return;
    
    // Only require proof for renewals
    if (editMode === 'renew' && !editPaymentProofUrl) {
      RNAlert.alert('Missing Proof', 'Please upload proof of payment to renew this ad.');
      return;
    }
    
    // Check if ad was already paid for and approved
    const wasAlreadyPaid = editingAd.paymentStatus === 'approved';
    
    // All edits require admin approval - set status to pending
    // But preserve payment status and stats if already paid
    const updateData: any = {
      headline: editHeadline.trim(),
      body_text: editBody.trim() || null,
      cta_text: editCta.trim() || 'Learn More',
      payment_reference: editReference || null,
      auto_renew: editAutoRenew,
      status: 'pending', // Always require approval for content changes
      updated_at: new Date().toISOString(),
    };

    // Only update payment status if it was never approved
    // If already paid, keep the approved status
    if (!wasAlreadyPaid) {
      updateData.payment_status = 'pending';
      updateData.admin_notes = null;
    }
    // If already paid, preserve admin_notes (don't include in update, so it keeps existing value)
    
    // Stats are automatically preserved - we don't update these columns:
    // - impressions_count, clicks_count, conversions_count
    // - spend_actual, revenue
    // They remain unchanged in the database

    // Only update payment proof if it's a renewal or if user uploaded new proof
    if (editMode === 'renew' || editProofDirty) {
      updateData.payment_proof_url = editPaymentProofUrl;
    }

    try {
      const { error } = await supabase
        .from('advertisements')
        .update(updateData)
        .eq('id', editingAd.id)
        .eq('created_by', user.id);
      if (error) throw error;
      setEditingAd(null);
      setEditPaymentProofUrl(null);
      setEditProofDirty(false);
      await loadAds();
      
      const message = editMode === 'renew'
        ? 'Your renewal request has been submitted for approval.'
        : wasAlreadyPaid
        ? 'Your ad changes have been submitted for admin approval. Your payment status and performance stats are preserved.'
        : 'Your ad changes have been submitted for admin approval.';
      RNAlert.alert('Submitted', message);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update ad.');
    }
  };

  const handlePickRenewProofImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please grant camera roll access to upload proof of payment');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploadingProof(true);
        try {
          const base64 = await getBase64FromAsset(asset);
          const fileName = buildAssetFileName(asset, 'ad-renewal-proof');
          const filePath = `ad_payment_proofs/${fileName}`;
          const publicUrl = await uploadBase64ToStorage(supabase, {
            bucket: 'ad_payment_proofs',
            filePath,
            base64,
            contentType: asset.mimeType || 'image/jpeg',
            upsert: false,
          });
          setEditPaymentProofUrl(publicUrl);
          setEditProofDirty(true);
        } catch (error: any) {
          RNAlert.alert('Upload Error', error.message || 'Failed to upload proof');
        } finally {
          setIsUploadingProof(false);
        }
      }
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  useEffect(() => {
    loadAds();
    loadAdSets();
  }, [loadAds, loadAdSets]);

  const handlePauseAd = async (adId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', adId)
        .eq('created_by', user.id);
      if (error) throw error;
      await loadAds();
      RNAlert.alert('Paused', 'Your ad has been paused.');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to pause ad.');
    }
  };

  const handleResumeAd = async (adId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', adId)
        .eq('created_by', user.id);
      if (error) throw error;
      await loadAds();
      RNAlert.alert('Resumed', 'Your ad has been resumed.');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to resume ad.');
    }
  };

  const loadAdAnalytics = async (ad: Advertisement) => {
    if (!user) return;
    setLoadingAnalytics(true);
    setAnalyticsAd(ad);
    try {
      const { data, error } = await supabase.rpc('get_ad_analytics', {
        ad_id_param: ad.id,
      });
      if (error) {
        // Check if function doesn't exist
        if (error.message?.includes('could not find') || error.message?.includes('schema cache')) {
          RNAlert.alert(
            'Analytics Not Available',
            'The analytics function needs to be set up in the database. Please contact support or run the SQL script: database/get_ad_analytics.sql'
          );
        } else {
          throw error;
        }
        setAnalyticsAd(null);
        return;
      }
      setAnalyticsData(data);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to load analytics.');
      setAnalyticsAd(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleDeleteAd = async (adId: string, adTitle: string) => {
    RNAlert.alert(
      'Delete Ad',
      `Are you sure you want to delete "${adTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              const { error } = await supabase
                .from('advertisements')
                .delete()
                .eq('id', adId)
                .eq('created_by', user.id);
              if (error) throw error;
              await loadAds();
              RNAlert.alert('Deleted', 'Your ad has been deleted.');
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete ad.');
            }
          },
        },
      ]
    );
  };

  const handleRemoveProof = async () => {
    if (!settings.confirmRemoveProofEnabled) {
      setEditPaymentProofUrl(null);
      setEditProofDirty(true);
      return;
    }
    RNAlert.alert(
      'Remove proof?',
      'This will clear the current proof of payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "Don't ask again",
          onPress: async () => {
            try {
              await updateRemoveProofConfirmPreference(false);
              setEditPaymentProofUrl(null);
              setEditProofDirty(true);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to update confirmation setting.');
            }
          },
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setEditPaymentProofUrl(null);
            setEditProofDirty(true);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>My Ads</Text>
        <TouchableOpacity onPress={loadAds}>
          <RefreshCcw size={18} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.accent.primary} />
        ) : ads.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No ads yet.</Text>
        ) : (
          ads.map(ad => {
            const expiryLabel = ad.endDate ? formatExpiry(ad.endDate) : null;
            const isExpiringSoon = Boolean(expiryLabel && (expiryLabel.includes('Expires in') || expiryLabel === 'Expires today'));
            const isExpired = expiryLabel === 'Expired';
            const adSet = ad.adSetId ? adSetsById[ad.adSetId] : undefined;
            const optimizationGoal = adSet?.optimizationGoal || 'impressions';
            const learningThreshold = adSet?.learningEventThreshold ?? 50;
            const learningEventsRaw = optimizationGoal === 'conversions' ? ad.conversionsCount : ad.clicksCount;
            const learningEvents = typeof learningEventsRaw === 'number' ? learningEventsRaw : 0;
            const isLearning = optimizationGoal !== 'impressions' && learningEvents < learningThreshold;
            const learningProgress = learningThreshold > 0 ? Math.min(learningEvents / learningThreshold, 1) : 1;
            const hasPacing = adSet?.pacingEnabled && adSet?.dailyBudget !== undefined && adSet?.dailyBudget !== null;
            const pacingProgress = hasPacing && adSet?.dailyBudget
              ? Math.min((adSet.spendActualToday || 0) / adSet.dailyBudget, 1)
              : 0;
            const sectionKey = `ad-${ad.id}`;
            const isPerformanceExpanded = expandedSections[`${sectionKey}-performance`] ?? true;
            const isDetailsExpanded = expandedSections[`${sectionKey}-details`] ?? false;
            const isActionsExpanded = expandedSections[`${sectionKey}-actions`] ?? false;

            const toggleSection = (section: string) => {
              setExpandedSections(prev => ({
                ...prev,
                [`${sectionKey}-${section}`]: !prev[`${sectionKey}-${section}`],
              }));
            };

            return (
            <View key={ad.id} style={[styles.adCard, { backgroundColor: theme.background.card }]}>
              {/* Ad Header - Always Visible */}
              <View style={styles.adHeader}>
                {ad.imageUrl && <Image source={{ uri: ad.imageUrl }} style={styles.adImage} />}
                <View style={styles.adHeaderContent}>
                  <Text style={[styles.adTitle, { color: theme.text.primary }]} numberOfLines={2}>{ad.title}</Text>
                  {ad.headline && (
                    <Text style={[styles.adHeadline, { color: theme.text.secondary }]} numberOfLines={1}>{ad.headline}</Text>
                  )}
                  <View style={styles.statusBadge}>
                    <View style={[
                      styles.statusDot, 
                      { backgroundColor: ad.status === 'active' ? '#10B981' : ad.status === 'paused' ? '#F59E0B' : ad.status === 'rejected' ? '#EF4444' : '#6B7280' }
                    ]} />
                    <Text style={[styles.statusText, { color: theme.text.secondary }]}>
                      {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                    </Text>
                    {ad.paymentStatus === 'approved' && (
                      <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>Paid</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Quick Stats - Always Visible */}
              <View style={styles.quickStats}>
                <View style={styles.quickStatItem}>
                  <Eye size={14} color={theme.text.tertiary} />
                  <Text style={[styles.quickStatValue, { color: theme.text.primary }]}>{ad.impressionsCount || 0}</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <MousePointerClick size={14} color={theme.text.tertiary} />
                  <Text style={[styles.quickStatValue, { color: theme.text.primary }]}>{ad.clicksCount || 0}</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <TrendingUp size={14} color={theme.text.tertiary} />
                  <Text style={[styles.quickStatValue, { color: theme.text.primary }]}>{ad.conversionsCount || 0}</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStatItem}>
                  <DollarSign size={14} color={theme.text.tertiary} />
                  <Text style={[styles.quickStatValue, { color: theme.text.primary }]}>
                    {ad.spendActual !== undefined ? ad.spendActual.toFixed(2) : '0.00'}
                  </Text>
                </View>
              </View>

              {/* Performance Section - Expandable */}
              <TouchableOpacity 
                style={styles.expandableSection}
                onPress={() => toggleSection('performance')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <BarChart3 size={18} color={theme.accent.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Performance</Text>
                  </View>
                  {isPerformanceExpanded ? (
                    <ChevronUp size={20} color={theme.text.tertiary} />
                  ) : (
                    <ChevronDown size={20} color={theme.text.tertiary} />
                  )}
                </View>
                {isPerformanceExpanded && (
                  <View style={styles.sectionContent}>
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Eye size={20} color={theme.accent.primary} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>{ad.impressionsCount || 0}</Text>
                        <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Impressions</Text>
                      </View>
                      <View style={styles.statItem}>
                        <MousePointerClick size={20} color={theme.accent.primary} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>{ad.clicksCount || 0}</Text>
                        <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Clicks</Text>
                      </View>
                      <View style={styles.statItem}>
                        <TrendingUp size={20} color={theme.accent.primary} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>{ad.conversionsCount || 0}</Text>
                        <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Conversions</Text>
                      </View>
                      <View style={styles.statItem}>
                        <DollarSign size={20} color={theme.accent.primary} />
                        <Text style={[styles.statValue, { color: theme.text.primary }]}>
                          {ad.spendActual !== undefined ? ad.spendActual.toFixed(2) : '0.00'}
                        </Text>
                        <Text style={[styles.statLabel, { color: theme.text.tertiary }]}>Spent</Text>
                      </View>
                    </View>
                    {ad.impressionsCount > 0 && (
                      <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricLabel, { color: theme.text.tertiary }]}>CTR</Text>
                          <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                            {((ad.clicksCount / ad.impressionsCount) * 100).toFixed(2)}%
                          </Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricLabel, { color: theme.text.tertiary }]}>CVR</Text>
                          <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                            {ad.clicksCount > 0 ? ((ad.conversionsCount / ad.clicksCount) * 100).toFixed(2) : '0.00'}%
                          </Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricItem}>
                          <Text style={[styles.metricLabel, { color: theme.text.tertiary }]}>Unique Users</Text>
                          <Text style={[styles.metricValue, { color: theme.text.primary }]}>
                            {ad.impressionsCount || 0}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {/* Details Section - Expandable */}
              <TouchableOpacity 
                style={styles.expandableSection}
                onPress={() => toggleSection('details')}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <Info size={18} color={theme.accent.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Details</Text>
                  </View>
                  {isDetailsExpanded ? (
                    <ChevronUp size={20} color={theme.text.tertiary} />
                  ) : (
                    <ChevronDown size={20} color={theme.text.tertiary} />
                  )}
                </View>
                {isDetailsExpanded && (
                  <View style={styles.sectionContent}>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Budget</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {ad.paymentCurrency || ad.spendCurrency || 'USD'} {ad.paymentAmount?.toFixed(2) ?? ad.spend?.toFixed(2) ?? '—'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Auto-renew</Text>
                      <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                        {ad.autoRenew ? 'On' : 'Off'}
                      </Text>
                    </View>
                    {ad.paymentReference && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Reference</Text>
                        <Text style={[styles.detailValue, { color: theme.text.primary }]}>{ad.paymentReference}</Text>
                      </View>
                    )}
                    {adSet && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Ad Set</Text>
                        <Text style={[styles.detailValue, { color: theme.text.primary }]}>
                          {adSet.name} · {(optimizationGoal || 'impressions').toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {ad.status === 'active' && ad.endDate && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Expires</Text>
                        <Text style={[
                          styles.detailValue, 
                          { color: expiryLabel?.includes('Expires') ? theme.accent.warning : theme.text.primary }
                        ]}>
                          {expiryLabel}
                        </Text>
                      </View>
                    )}
                    {ad.adminNotes && (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Admin Notes</Text>
                        <Text style={[styles.detailValue, { color: theme.text.primary }]}>{ad.adminNotes}</Text>
                      </View>
                    )}
                    {isLearning && (
                      <View style={styles.learningRow}>
                        <Text style={[styles.detailLabel, { color: theme.text.tertiary, marginBottom: 8 }]}>Learning Progress</Text>
                        <View style={[styles.learningBar, { backgroundColor: theme.border.light }]}>
                          <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${learningProgress * 100}%` }]} />
                        </View>
                        <Text style={[styles.learningText, { color: theme.text.tertiary }]}>
                          {learningEvents}/{learningThreshold} events
                        </Text>
                      </View>
                    )}
                    {hasPacing && (
                      <View style={styles.learningRow}>
                        <Text style={[styles.detailLabel, { color: theme.text.tertiary, marginBottom: 8 }]}>Daily Spend</Text>
                        <View style={[styles.learningBar, { backgroundColor: theme.border.light }]}>
                          <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${pacingProgress * 100}%` }]} />
                        </View>
                        <Text style={[styles.learningText, { color: theme.text.tertiary }]}>
                          {adSet?.currency || 'USD'} {adSet?.spendActualToday?.toFixed(2) ?? '0.00'} / {adSet?.dailyBudget?.toFixed(2) ?? '—'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {adSet && (
                <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                  Ad Set: {adSet.name} · Goal: {(optimizationGoal || 'impressions').toUpperCase()}
                </Text>
              )}
              {isLearning && (
                <View style={styles.learningRow}>
                  <View style={[styles.learningBar, { backgroundColor: theme.border.light }]}>
                    <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${learningProgress * 100}%` }]} />
                  </View>
                  <Text style={[styles.learningText, { color: theme.text.tertiary }]}>
                    Learning: {learningEvents}/{learningThreshold} events
                  </Text>
                </View>
              )}
              {hasPacing && (
                <View style={styles.learningRow}>
                  <View style={[styles.learningBar, { backgroundColor: theme.border.light }]}>
                    <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${pacingProgress * 100}%` }]} />
                  </View>
                  <Text style={[styles.learningText, { color: theme.text.tertiary }]}>
                    Today: {adSet?.currency || 'USD'} {adSet?.spendActualToday?.toFixed(2) ?? '0.00'} / {adSet?.dailyBudget?.toFixed(2) ?? '—'}
                  </Text>
                </View>
              )}
              {ad.status === 'active' && ad.endDate && (
                <Text style={[
                  styles.metaText,
                  { color: expiryLabel?.includes('Expires') ? theme.accent.warning : theme.text.tertiary },
                ]}>
                  {expiryLabel}
                </Text>
              )}
              {ad.adminNotes && (
                <Text style={[styles.metaText, { color: theme.text.tertiary }]}>Admin: {ad.adminNotes}</Text>
              )}
              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                {ad.impressionsCount > 0 && (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.accent.info || '#3B82F6' }]}
                    onPress={() => loadAdAnalytics(ad)}
                  >
                    <BarChart3 size={16} color={theme.accent.info || '#3B82F6'} />
                    <Text style={[styles.actionButtonText, { color: theme.accent.info || '#3B82F6' }]}>Analytics</Text>
                  </TouchableOpacity>
                )}
                {ad.status === 'active' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.accent.warning }]}
                    onPress={() => handlePauseAd(ad.id)}
                  >
                    <Pause size={16} color={theme.accent.warning} />
                    <Text style={[styles.actionButtonText, { color: theme.accent.warning }]}>Pause</Text>
                  </TouchableOpacity>
                )}
                {ad.status === 'paused' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.accent.success }]}
                    onPress={() => handleResumeAd(ad.id)}
                  >
                    <Play size={16} color={theme.accent.success} />
                    <Text style={[styles.actionButtonText, { color: theme.accent.success }]}>Resume</Text>
                  </TouchableOpacity>
                )}
                {(ad.status === 'active' || ad.status === 'paused' || ad.status === 'pending') && (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.accent.primary }]}
                    onPress={() => openEditModal(ad, ad.status === 'active' && (isExpiringSoon || isExpired) ? 'renew' : 'resubmit')}
                  >
                    <Edit size={16} color={theme.accent.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.accent.primary }]}>Edit</Text>
                  </TouchableOpacity>
                )}
                {ad.status === 'rejected' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.accent.primary }]}
                    onPress={() => openEditModal(ad)}
                  >
                    <Edit size={16} color={theme.accent.primary} />
                    <Text style={[styles.actionButtonText, { color: theme.accent.primary }]}>Edit & Resubmit</Text>
                  </TouchableOpacity>
                )}
                {(ad.status === 'active' || ad.status === 'paused' || ad.status === 'rejected' || ad.status === 'pending') && (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.accent.danger }]}
                    onPress={() => handleDeleteAd(ad.id, ad.title)}
                  >
                    <Trash2 size={16} color={theme.accent.danger} />
                    <Text style={[styles.actionButtonText, { color: theme.accent.danger }]}>Delete</Text>
                  </TouchableOpacity>
                )}
                {ad.status === 'active' && (isExpiringSoon || isExpired) && (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: theme.accent.warning }]}
                    onPress={() => openEditModal(ad, 'renew')}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.accent.warning }]}>Renew</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )})
        )}
      </ScrollView>

      <Modal visible={!!editingAd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editMode === 'renew' ? 'Renew Ad' : 'Edit Ad'}
              </Text>
              <TouchableOpacity onPress={() => setEditingAd(null)}>
                <Text style={[styles.modalClose, { color: theme.text.secondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {editingAd && (() => {
                const adSet = editingAd.adSetId ? adSetsById[editingAd.adSetId] : undefined;
                if (!adSet) return null;
                const optimizationGoal = adSet.optimizationGoal || 'impressions';
                const learningThreshold = adSet.learningEventThreshold ?? 50;
                const learningEventsRaw = optimizationGoal === 'conversions' ? editingAd.conversionsCount : editingAd.clicksCount;
                const learningEvents = typeof learningEventsRaw === 'number' ? learningEventsRaw : 0;
                const isLearning = optimizationGoal !== 'impressions' && learningEvents < learningThreshold;
                const learningProgress = learningThreshold > 0 ? Math.min(learningEvents / learningThreshold, 1) : 1;
                const hasPacing = adSet.pacingEnabled && adSet.dailyBudget !== undefined && adSet.dailyBudget !== null;
                const pacingProgress = hasPacing && adSet.dailyBudget
                  ? Math.min((adSet.spendActualToday || 0) / adSet.dailyBudget, 1)
                  : 0;

                return (
                  <View style={styles.modalInsights}>
                    <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                      Ad Set: {adSet.name} · Goal: {(optimizationGoal || 'impressions').toUpperCase()}
                    </Text>
                    {isLearning && (
                      <View style={styles.learningRow}>
                        <View style={[styles.learningBar, { backgroundColor: theme.border.light }]}>
                          <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${learningProgress * 100}%` }]} />
                        </View>
                        <Text style={[styles.learningText, { color: theme.text.tertiary }]}>
                          Learning: {learningEvents}/{learningThreshold} events
                        </Text>
                      </View>
                    )}
                    {hasPacing && (
                      <View style={styles.learningRow}>
                        <View style={[styles.learningBar, { backgroundColor: theme.border.light }]}>
                          <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${pacingProgress * 100}%` }]} />
                        </View>
                        <Text style={[styles.learningText, { color: theme.text.tertiary }]}>
                          Today: {adSet?.currency || 'USD'} {adSet?.spendActualToday?.toFixed(2) ?? '0.00'} / {adSet?.dailyBudget?.toFixed(2) ?? '—'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
              <Text style={[styles.label, { color: theme.text.secondary }]}>Headline</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={editHeadline}
                onChangeText={setEditHeadline}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Body</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={editBody}
                onChangeText={setEditBody}
                multiline
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>CTA Text</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={editCta}
                onChangeText={setEditCta}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Payment Reference</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={editReference}
                onChangeText={setEditReference}
              />
              {editMode !== 'renew' && (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>
                    Proof of Payment {editingAd?.paymentStatus === 'approved' ? '(Not Required - Already Paid)' : '(Optional)'}
                  </Text>
                  {editingAd?.paymentStatus === 'approved' && (
                    <Text style={[styles.helpText, { color: theme.text.tertiary }]}>
                      Your ad has already been paid for. Proof of payment is not required for edits.
                    </Text>
                  )}
                  {editPaymentProofUrl ? (
                    <>
                      <Image source={{ uri: editPaymentProofUrl }} style={styles.proofImage} />
                      <View style={styles.proofActionsRow}>
                        <TouchableOpacity
                          style={[styles.proofUploadButton, { borderColor: theme.border.light, flex: 1 }]}
                          onPress={handlePickRenewProofImage}
                          disabled={isUploadingProof}
                        >
                          <Text style={[styles.proofUploadText, { color: theme.text.primary }]}>
                            {isUploadingProof ? 'Uploading...' : 'Update Proof'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.proofUploadButton, { borderColor: theme.border.light, flex: 1 }]}
                          onPress={handleRemoveProof}
                        >
                          <Text style={[styles.proofUploadText, { color: theme.text.secondary }]}>
                            Remove Proof
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/settings', params: { section: 'confirm-proof' } } as any)}>
                        <Text style={[styles.manageConfirmText, { color: theme.text.tertiary }]}>
                          Manage confirmation settings
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.proofUploadButton, { borderColor: theme.border.light }]}
                      onPress={handlePickRenewProofImage}
                      disabled={isUploadingProof}
                    >
                      <Text style={[styles.proofUploadText, { color: theme.text.primary }]}>
                        {isUploadingProof ? 'Uploading...' : 'Upload Proof'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              {editMode === 'renew' && (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Proof of Payment *</Text>
                  {editPaymentProofUrl ? (
                    <>
                      <Image source={{ uri: editPaymentProofUrl }} style={styles.proofImage} />
                      <View style={styles.proofActionsRow}>
                        <TouchableOpacity
                          style={[styles.proofUploadButton, { borderColor: theme.border.light, flex: 1 }]}
                          onPress={handlePickRenewProofImage}
                          disabled={isUploadingProof}
                        >
                          <Text style={[styles.proofUploadText, { color: theme.text.primary }]}>
                            {isUploadingProof ? 'Uploading...' : 'Update Proof'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.proofUploadButton, { borderColor: theme.border.light, flex: 1 }]}
                          onPress={handleRemoveProof}
                        >
                          <Text style={[styles.proofUploadText, { color: theme.text.secondary }]}>
                            Remove Proof
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/settings', params: { section: 'confirm-proof' } } as any)}>
                        <Text style={[styles.manageConfirmText, { color: theme.text.tertiary }]}>
                          Manage confirmation settings
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.proofUploadButton, { borderColor: theme.border.light }]}
                      onPress={handlePickRenewProofImage}
                      disabled={isUploadingProof}
                    >
                      <Text style={[styles.proofUploadText, { color: theme.text.primary }]}>
                        {isUploadingProof ? 'Uploading...' : 'Upload Proof'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Auto-renew</Text>
                <Switch value={editAutoRenew} onValueChange={setEditAutoRenew} />
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => setEditingAd(null)}
              >
                <Text style={[styles.cancelText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleResubmit}
              >
                <Text style={styles.saveText}>
                  {editMode === 'renew' ? 'Submit Renewal' : 'Submit for Approval'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <Modal visible={!!analyticsAd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.primary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Ad Analytics: {analyticsAd?.title}
              </Text>
              <TouchableOpacity onPress={() => { setAnalyticsAd(null); setAnalyticsData(null); }}>
                <Text style={[styles.closeButton, { color: theme.text.secondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {loadingAnalytics ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.accent.primary} />
                  <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading analytics...</Text>
                </View>
              ) : analyticsData ? (
                <>
                  {/* Overview */}
                  {analyticsData.overview && (
                    <View style={[styles.analyticsSection, { backgroundColor: theme.background.card }]}>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Overview</Text>
                      <View style={styles.overviewGrid}>
                        <View style={styles.overviewItem}>
                          <Text style={[styles.overviewValue, { color: theme.text.primary }]}>
                            {analyticsData.overview.total_impressions || 0}
                          </Text>
                          <Text style={[styles.overviewLabel, { color: theme.text.tertiary }]}>Impressions</Text>
                        </View>
                        <View style={styles.overviewItem}>
                          <Text style={[styles.overviewValue, { color: theme.text.primary }]}>
                            {analyticsData.overview.total_clicks || 0}
                          </Text>
                          <Text style={[styles.overviewLabel, { color: theme.text.tertiary }]}>Clicks</Text>
                        </View>
                        <View style={styles.overviewItem}>
                          <Text style={[styles.overviewValue, { color: theme.text.primary }]}>
                            {analyticsData.overview.total_conversions || 0}
                          </Text>
                          <Text style={[styles.overviewLabel, { color: theme.text.tertiary }]}>Conversions</Text>
                        </View>
                        <View style={styles.overviewItem}>
                          <Text style={[styles.overviewValue, { color: theme.text.primary }]}>
                            {analyticsData.overview.unique_users || 0}
                          </Text>
                          <Text style={[styles.overviewLabel, { color: theme.text.tertiary }]}>Unique Users</Text>
                        </View>
                        <View style={styles.overviewItem}>
                          <Text style={[styles.overviewValue, { color: theme.text.primary }]}>
                            {analyticsData.overview.ctr || 0}%
                          </Text>
                          <Text style={[styles.overviewLabel, { color: theme.text.tertiary }]}>CTR</Text>
                        </View>
                        <View style={styles.overviewItem}>
                          <Text style={[styles.overviewValue, { color: theme.text.primary }]}>
                            {analyticsData.overview.cvr || 0}%
                          </Text>
                          <Text style={[styles.overviewLabel, { color: theme.text.tertiary }]}>CVR</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Demographics */}
                  {analyticsData.demographics && (
                    <>
                      {/* Age Groups */}
                      {analyticsData.demographics.age_groups && analyticsData.demographics.age_groups.length > 0 && (
                        <View style={[styles.analyticsSection, { backgroundColor: theme.background.card }]}>
                          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                            <Users size={18} color={theme.text.primary} /> Age Groups
                          </Text>
                          {analyticsData.demographics.age_groups.map((item: any, idx: number) => (
                            <View key={idx} style={styles.demographicRow}>
                              <View style={styles.demographicLabelRow}>
                                <Text style={[styles.demographicLabel, { color: theme.text.secondary }]}>
                                  {item.age_group}
                                </Text>
                                <Text style={[styles.demographicValue, { color: theme.text.primary }]}>
                                  {item.count} impressions
                                </Text>
                              </View>
                              <View style={[styles.progressBar, { backgroundColor: theme.border.light }]}>
                                <View 
                                  style={[
                                    styles.progressFill, 
                                    { 
                                      backgroundColor: theme.accent.primary, 
                                      width: `${analyticsData.overview.total_impressions > 0 ? (item.count / analyticsData.overview.total_impressions) * 100 : 0}%` 
                                    }
                                  ]} 
                                />
                              </View>
                              <Text style={[styles.demographicSubtext, { color: theme.text.tertiary }]}>
                                {item.clicks} clicks • {item.conversions} conversions
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Gender */}
                      {analyticsData.demographics.gender && analyticsData.demographics.gender.length > 0 && (
                        <View style={[styles.analyticsSection, { backgroundColor: theme.background.card }]}>
                          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Gender</Text>
                          {analyticsData.demographics.gender.map((item: any, idx: number) => (
                            <View key={idx} style={styles.demographicRow}>
                              <View style={styles.demographicLabelRow}>
                                <Text style={[styles.demographicLabel, { color: theme.text.secondary }]}>
                                  {item.gender}
                                </Text>
                                <Text style={[styles.demographicValue, { color: theme.text.primary }]}>
                                  {item.count} impressions
                                </Text>
                              </View>
                              <View style={[styles.progressBar, { backgroundColor: theme.border.light }]}>
                                <View 
                                  style={[
                                    styles.progressFill, 
                                    { 
                                      backgroundColor: theme.accent.primary, 
                                      width: `${analyticsData.overview.total_impressions > 0 ? (item.count / analyticsData.overview.total_impressions) * 100 : 0}%` 
                                    }
                                  ]} 
                                />
                              </View>
                              <Text style={[styles.demographicSubtext, { color: theme.text.tertiary }]}>
                                {item.clicks} clicks • {item.conversions} conversions
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Interests */}
                      {analyticsData.demographics.interests && analyticsData.demographics.interests.length > 0 && (
                        <View style={[styles.analyticsSection, { backgroundColor: theme.background.card }]}>
                          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Top Interests</Text>
                          {analyticsData.demographics.interests.map((item: any, idx: number) => (
                            <View key={idx} style={styles.demographicRow}>
                              <View style={styles.demographicLabelRow}>
                                <Text style={[styles.demographicLabel, { color: theme.text.secondary }]}>
                                  {item.interest}
                                </Text>
                                <Text style={[styles.demographicValue, { color: theme.text.primary }]}>
                                  {item.count} users
                                </Text>
                              </View>
                              <Text style={[styles.demographicSubtext, { color: theme.text.tertiary }]}>
                                {item.clicks} clicks • {item.conversions} conversions
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Business Types */}
                      {analyticsData.demographics.business_types && analyticsData.demographics.business_types.length > 0 && (
                        <View style={[styles.analyticsSection, { backgroundColor: theme.background.card }]}>
                          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Business Types</Text>
                          {analyticsData.demographics.business_types.map((item: any, idx: number) => (
                            <View key={idx} style={styles.demographicRow}>
                              <View style={styles.demographicLabelRow}>
                                <Text style={[styles.demographicLabel, { color: theme.text.secondary }]}>
                                  {item.business_type}
                                </Text>
                                <Text style={[styles.demographicValue, { color: theme.text.primary }]}>
                                  {item.count} impressions
                                </Text>
                              </View>
                              <Text style={[styles.demographicSubtext, { color: theme.text.tertiary }]}>
                                {item.clicks} clicks • {item.conversions} conversions
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Business Stages */}
                      {analyticsData.demographics.business_stages && analyticsData.demographics.business_stages.length > 0 && (
                        <View style={[styles.analyticsSection, { backgroundColor: theme.background.card }]}>
                          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Business Stages</Text>
                          {analyticsData.demographics.business_stages.map((item: any, idx: number) => (
                            <View key={idx} style={styles.demographicRow}>
                              <View style={styles.demographicLabelRow}>
                                <Text style={[styles.demographicLabel, { color: theme.text.secondary }]}>
                                  {item.stage}
                                </Text>
                                <Text style={[styles.demographicValue, { color: theme.text.primary }]}>
                                  {item.count} impressions
                                </Text>
                              </View>
                              <Text style={[styles.demographicSubtext, { color: theme.text.tertiary }]}>
                                {item.clicks} clicks • {item.conversions} conversions
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Locations */}
                      {analyticsData.demographics.locations && analyticsData.demographics.locations.length > 0 && (
                        <View style={[styles.analyticsSection, { backgroundColor: theme.background.card }]}>
                          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
                            <MapPin size={18} color={theme.text.primary} /> Top Locations
                          </Text>
                          {analyticsData.demographics.locations.map((item: any, idx: number) => (
                            <View key={idx} style={styles.demographicRow}>
                              <View style={styles.demographicLabelRow}>
                                <Text style={[styles.demographicLabel, { color: theme.text.secondary }]}>
                                  {item.location}
                                </Text>
                                <Text style={[styles.demographicValue, { color: theme.text.primary }]}>
                                  {item.count} impressions
                                </Text>
                              </View>
                              <Text style={[styles.demographicSubtext, { color: theme.text.tertiary }]}>
                                {item.clicks} clicks • {item.conversions} conversions
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                    No analytics data available yet
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => { setAnalyticsAd(null); setAnalyticsData(null); }}
              >
                <Text style={[styles.cancelText, { color: theme.text.secondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, gap: 12 },
  emptyText: { textAlign: 'center', marginTop: 40 },
  adCard: { 
    padding: 0, 
    borderRadius: 16, 
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  adHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  adImage: { 
    width: 80, 
    height: 80, 
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  adHeaderContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  adTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 4,
    lineHeight: 22,
  },
  adHeadline: { 
    fontSize: 13, 
    marginBottom: 8,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomColor: '#E5E7EB',
  },
  quickStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  expandableSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 12, marginTop: 4 },
  learningRow: { width: '100%', gap: 6, marginTop: 8 },
  learningBar: { height: 6, borderRadius: 999, overflow: 'hidden' },
  learningFill: { height: 6, borderRadius: 999 },
  learningText: { fontSize: 11 },
  resubmitButton: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  resubmitText: {
    fontSize: 13,
    fontWeight: '600',
  },
  renewButton: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  renewText: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalClose: { fontSize: 14, fontWeight: '600' },
  modalBody: { padding: 16, gap: 8 },
  modalInsights: { marginBottom: 12, gap: 6 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  input: { padding: 12, borderRadius: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  proofUploadButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  proofUploadText: { fontSize: 14, fontWeight: '600' },
  proofImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  proofActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  manageConfirmText: {
    fontSize: 12,
    marginTop: 6,
  },
  modalFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  statsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    minWidth: '30%',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  helpText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  analyticsSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewItem: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 11,
  },
  demographicRow: {
    marginBottom: 16,
  },
  demographicLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  demographicLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  demographicValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  demographicSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
});

