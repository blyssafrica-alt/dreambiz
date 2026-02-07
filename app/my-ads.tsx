import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert as RNAlert, Modal, TextInput, Switch } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/lib/supabase';
import type { Advertisement } from '@/types/super-admin';
import { ArrowLeft, RefreshCcw } from 'lucide-react-native';
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
    if (editMode === 'renew' && !editPaymentProofUrl) {
      RNAlert.alert('Missing Proof', 'Please upload proof of payment to renew this ad.');
      return;
    }
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({
          headline: editHeadline.trim(),
          body_text: editBody.trim() || null,
          cta_text: editCta.trim() || 'Learn More',
          payment_reference: editReference || null,
          ...(editMode === 'renew' || editProofDirty
            ? { payment_proof_url: editPaymentProofUrl }
            : {}),
          auto_renew: editAutoRenew,
          status: 'pending',
          payment_status: 'pending',
          admin_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingAd.id)
        .eq('created_by', user.id);
      if (error) throw error;
      setEditingAd(null);
      setEditPaymentProofUrl(null);
      setEditProofDirty(false);
      await loadAds();
      const message =
        editMode === 'renew'
          ? 'Your renewal request has been submitted for approval.'
          : 'Your ad has been resubmitted for review.';
      RNAlert.alert('Submitted', message);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to resubmit ad.');
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
            return (
            <View key={ad.id} style={[styles.adCard, { backgroundColor: theme.background.card }]}>
              {ad.imageUrl && <Image source={{ uri: ad.imageUrl }} style={styles.adImage} />}
              <Text style={[styles.adTitle, { color: theme.text.primary }]}>{ad.title}</Text>
              {ad.headline && (
                <Text style={[styles.adHeadline, { color: theme.text.secondary }]}>{ad.headline}</Text>
              )}
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                  Status: {ad.status}
                </Text>
                <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                  Payment: {ad.paymentStatus || 'pending'}
                </Text>
              </View>
              <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                Auto-renew: {ad.autoRenew ? 'On' : 'Off'}
              </Text>
              <Text style={[styles.metaText, { color: theme.text.secondary }]}>
                Budget: {ad.paymentCurrency || ad.spendCurrency || 'USD'} {ad.paymentAmount?.toFixed(2) ?? ad.spend?.toFixed(2) ?? '—'}
              </Text>
              {ad.paymentReference && (
                <Text style={[styles.metaText, { color: theme.text.tertiary }]}>Ref: {ad.paymentReference}</Text>
              )}
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
              {ad.status === 'rejected' && (
                <TouchableOpacity
                  style={[styles.resubmitButton, { borderColor: theme.accent.primary }]}
                  onPress={() => openEditModal(ad)}
                >
                  <Text style={[styles.resubmitText, { color: theme.accent.primary }]}>Edit & Resubmit</Text>
                </TouchableOpacity>
              )}
              {ad.status === 'active' && (isExpiringSoon || isExpired) && (
                <TouchableOpacity
                  style={[styles.renewButton, { borderColor: theme.accent.warning }]}
                  onPress={() => openEditModal(ad, 'renew')}
                >
                  <Text style={[styles.renewText, { color: theme.accent.warning }]}>Renew Now</Text>
                </TouchableOpacity>
              )}
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
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Proof of Payment (Optional)</Text>
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
                <Text style={styles.saveText}>{editMode === 'renew' ? 'Submit Renewal' : 'Resubmit'}</Text>
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
  adCard: { padding: 16, borderRadius: 12 },
  adImage: { width: '100%', height: 160, borderRadius: 10, marginBottom: 12 },
  adTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  adHeadline: { fontSize: 14, marginBottom: 8 },
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
});

