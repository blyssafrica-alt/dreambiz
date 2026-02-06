import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAds } from '@/contexts/AdContext';
import { AdCard } from '@/components/AdCard';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Megaphone, TrendingUp, Eye, MousePointerClick, X, Save, Trash2, Edit, ImageIcon, Upload } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Advertisement, AdType, AdStatus, AdFrequency } from '@/types/super-admin';
import type { BusinessStage, BusinessType, DreamBigBook } from '@/types/business';
import * as ImagePicker from 'expo-image-picker';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';

export default function AdsManagementScreen() {
  const LOCATION_OPTIONS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'products', label: 'Products' },
    { key: 'customers', label: 'Customers' },
    { key: 'finances', label: 'Finances' },
    { key: 'documents', label: 'Documents' },
    { key: 'insights', label: 'Insights' },
  ];
  const FREQUENCY_OPTIONS: AdFrequency[] = ['once_per_session', 'once_per_day', 'always'];
  const BUSINESS_TYPE_OPTIONS: BusinessType[] = [
    'retail',
    'services',
    'manufacturing',
    'agriculture',
    'restaurant',
    'salon',
    'construction',
    'transport',
    'other',
  ];
  const BUSINESS_STAGE_OPTIONS: BusinessStage[] = ['idea', 'startup', 'running', 'growth', 'growing', 'mature'];
  const BOOK_OPTIONS: DreamBigBook[] = [
    'start-your-business',
    'grow-your-business',
    'manage-your-money',
    'hire-and-lead',
    'marketing-mastery',
    'scale-up',
    'none',
  ];
  const { theme } = useTheme();
  const { user } = useAuth();
  const { refreshAds } = useAds();
  const router = useRouter();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'banner' as AdType,
    headline: '',
    bodyText: '',
    ctaText: 'Learn More',
    ctaUrl: '',
    ctaAction: 'external_url' as 'external_url' | 'open_product' | 'open_book' | 'open_feature',
    ctaTargetId: '',
    ctaExternalType: 'website' as 'website' | 'whatsapp',
    ctaWhatsAppNumber: '',
    ctaWhatsAppMessage: '',
    spend: '',
    spendCurrency: 'USD',
    status: 'draft' as AdStatus,
    startDate: '',
    endDate: '',
    imageUrl: '',
    videoUrl: '',
    thumbnailUrl: '',
    placementLocations: ['dashboard'] as string[],
    placementPriority: '1',
    placementFrequency: 'once_per_session' as AdFrequency,
    maxImpressionsPerUser: '',
    modalDelaySeconds: '',
    targetingScope: 'global' as 'global' | 'targeted',
    targetBooks: [] as DreamBigBook[],
    targetBusinessTypes: [] as BusinessType[],
    targetBusinessStages: [] as BusinessStage[],
    targetFeatures: '',
    excludeUsers: '',
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const { data: revenueData, error: revenueError } = await supabase
          .from('ad_impressions')
          .select('ad_id, conversion_value')
          .eq('converted', true);

        if (revenueError) {
          console.warn('Failed to load ad revenue:', revenueError);
        }

        const revenueMap = (revenueData || []).reduce<Record<string, number>>((acc, row: any) => {
          const value = row.conversion_value ? parseFloat(row.conversion_value) : 0;
          acc[row.ad_id] = (acc[row.ad_id] || 0) + value;
          return acc;
        }, {});

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
          spend: row.spend !== null && row.spend !== undefined ? parseFloat(row.spend) : undefined,
          spendCurrency: row.spend_currency || 'USD',
          revenue: revenueMap[row.id] || 0,
          paymentStatus: row.payment_status || undefined,
          paymentAmount: row.payment_amount !== null && row.payment_amount !== undefined ? parseFloat(row.payment_amount) : undefined,
          paymentCurrency: row.payment_currency || undefined,
          paymentReference: row.payment_reference || undefined,
          paymentProofUrl: row.payment_proof_url || undefined,
          adminNotes: row.admin_notes || undefined,
          adPackageId: row.ad_package_id || undefined,
          startDate: row.start_date,
          endDate: row.end_date,
          timezone: row.timezone || 'Africa/Harare',
          status: row.status,
          impressionsCount: row.impressions_count || 0,
          clicksCount: row.clicks_count || 0,
          conversionsCount: row.conversions_count || 0,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (ad?: Advertisement) => {
    if (ad) {
      setEditingAd(ad);
      const isWhatsAppUrl = (ad.ctaUrl || '').includes('wa.me') || (ad.ctaUrl || '').includes('api.whatsapp.com');
      setFormData({
        title: ad.title,
        description: ad.description || '',
        type: ad.type,
        headline: ad.headline || '',
        bodyText: ad.bodyText || '',
        ctaText: ad.ctaText,
        ctaUrl: ad.ctaUrl || '',
        ctaAction: (ad.ctaAction as any) || 'external_url',
        ctaTargetId: ad.ctaTargetId || '',
        ctaExternalType: isWhatsAppUrl ? 'whatsapp' : 'website',
        ctaWhatsAppNumber: '',
        ctaWhatsAppMessage: '',
        spend: ad.spend !== undefined ? String(ad.spend) : '',
        spendCurrency: ad.spendCurrency || 'USD',
        status: ad.status,
        startDate: ad.startDate || '',
        endDate: ad.endDate || '',
        imageUrl: ad.imageUrl || '',
        videoUrl: ad.videoUrl || '',
        thumbnailUrl: ad.thumbnailUrl || '',
        placementLocations: ad.placement?.locations?.length ? ad.placement.locations : ['dashboard'],
        placementPriority: String(ad.placement?.priority ?? 1),
        placementFrequency: (ad.placement?.frequency as AdFrequency) || 'once_per_session',
        maxImpressionsPerUser: ad.placement?.maxImpressionsPerUser
          ? String(ad.placement.maxImpressionsPerUser)
          : '',
        modalDelaySeconds: ad.placement?.delaySeconds ? String(ad.placement.delaySeconds) : '',
        targetingScope: ad.targeting?.scope || 'global',
        targetBooks: Array.isArray(ad.targeting?.targetBooks) ? ad.targeting.targetBooks : [],
        targetBusinessTypes: Array.isArray(ad.targeting?.targetBusinessTypes) ? ad.targeting.targetBusinessTypes : [],
        targetBusinessStages: Array.isArray(ad.targeting?.targetBusinessStages) ? ad.targeting.targetBusinessStages : [],
        targetFeatures: Array.isArray(ad.targeting?.targetFeatures) ? ad.targeting.targetFeatures.join(', ') : '',
        excludeUsers: Array.isArray(ad.targeting?.excludeUsers) ? ad.targeting.excludeUsers.join(', ') : '',
      });
    } else {
      setEditingAd(null);
      setFormData({
        title: '',
        description: '',
        type: 'banner',
        headline: '',
        bodyText: '',
        ctaText: 'Learn More',
        ctaUrl: '',
        ctaAction: 'external_url',
        ctaTargetId: '',
        ctaExternalType: 'website',
        ctaWhatsAppNumber: '',
        ctaWhatsAppMessage: '',
        spend: '',
        spendCurrency: 'USD',
        status: 'draft',
        startDate: '',
        endDate: '',
        imageUrl: '',
        videoUrl: '',
        thumbnailUrl: '',
        placementLocations: ['dashboard'],
        placementPriority: '1',
        placementFrequency: 'once_per_session',
        maxImpressionsPerUser: '',
        modalDelaySeconds: '',
        targetingScope: 'global',
        targetBooks: [],
        targetBusinessTypes: [],
        targetBusinessStages: [],
        targetFeatures: '',
        excludeUsers: '',
      });
    }
    setShowModal(true);
  };

  const handlePickImage = async (field: 'imageUrl' | 'thumbnailUrl') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant media library permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'imageUrl' ? [16, 9] : [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setIsUploadingImage(true);
      try {
        const base64 = await getBase64FromAsset(asset);
        const fileName = buildAssetFileName(asset, `ad-${field}`);
        const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `ad_images/${fileName}`;

        // Determine correct MIME type from file extension or asset.mimeType
        let contentType = 'image/jpeg'; // default
        if (asset.mimeType) {
          // Extract the first valid mime type if multiple are present
          const mimeTypes = asset.mimeType.split(',').map(m => m.trim());
          const imageMime = mimeTypes.find(m => m.startsWith('image/'));
          if (imageMime) {
            contentType = imageMime;
          }
        }
        
        // Fallback to MIME type based on file extension
        if (!contentType || contentType === 'image/jpeg') {
          const mimeMap: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
          };
          contentType = mimeMap[fileExt] || 'image/jpeg';
        }

        const publicUrl = await uploadBase64ToStorage(supabase, {
          bucket: 'ad_images',
          filePath,
          base64,
          contentType,
          upsert: false,
        });

        setFormData(prev => ({
          ...prev,
          [field]: publicUrl,
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Upload Error', `Failed to upload image: ${(error as Error).message}`);
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleRemoveImage = (field: 'imageUrl' | 'thumbnailUrl') => {
    setFormData(prev => ({
      ...prev,
      [field]: '',
    }));
  };

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Please fill in title');
      return;
    }

    try {
      const buildWhatsAppUrl = () => {
        const sanitizedNumber = formData.ctaWhatsAppNumber.replace(/[^\d]/g, '');
        if (!sanitizedNumber) return '';
        const message = formData.ctaWhatsAppMessage.trim();
        const query = message ? `?text=${encodeURIComponent(message)}` : '';
        return `https://wa.me/${sanitizedNumber}${query}`;
      };
      const normalizedWebsiteUrl = () => {
        const raw = formData.ctaUrl.trim();
        if (!raw) return '';
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
        return `https://${raw}`;
      };
      const parsedPriority = parseInt(formData.placementPriority, 10);
      const parsedMaxImpressions = parseInt(formData.maxImpressionsPerUser, 10);
      const parsedDelaySeconds = parseInt(formData.modalDelaySeconds, 10);
      const parsedSpend = parseFloat(formData.spend);
      const cleanedLocations = formData.placementLocations.length > 0
        ? Array.from(new Set(formData.placementLocations))
        : ['dashboard'];
      const targetFeatures = formData.targetFeatures
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      const excludeUsers = formData.excludeUsers
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
      const adData: any = {
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        image_url: formData.imageUrl || null,
        video_url: formData.videoUrl || null,
        thumbnail_url: formData.thumbnailUrl || null,
        headline: formData.headline || null,
        body_text: formData.bodyText || null,
        cta_text: formData.ctaText,
        cta_url:
          formData.ctaAction === 'external_url'
            ? (formData.ctaExternalType === 'whatsapp' ? buildWhatsAppUrl() : normalizedWebsiteUrl()) || null
            : formData.ctaUrl || null,
        cta_action: formData.ctaAction,
        cta_target_id: formData.ctaTargetId || null,
        spend: Number.isFinite(parsedSpend) && parsedSpend >= 0 ? parsedSpend : null,
        spend_currency: formData.spendCurrency || 'USD',
        status: formData.status,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        timezone: 'Africa/Harare',
        targeting: {
          scope: formData.targetingScope,
          ...(formData.targetBooks.length > 0 ? { targetBooks: formData.targetBooks } : {}),
          ...(formData.targetBusinessTypes.length > 0 ? { targetBusinessTypes: formData.targetBusinessTypes } : {}),
          ...(formData.targetBusinessStages.length > 0 ? { targetBusinessStages: formData.targetBusinessStages } : {}),
          ...(targetFeatures.length > 0 ? { targetFeatures } : {}),
          ...(excludeUsers.length > 0 ? { excludeUsers } : {}),
        },
        placement: {
          locations: cleanedLocations,
          priority: Number.isFinite(parsedPriority) && parsedPriority > 0 ? parsedPriority : 1,
          frequency: formData.placementFrequency,
          ...(Number.isFinite(parsedMaxImpressions) && parsedMaxImpressions > 0
            ? { maxImpressionsPerUser: parsedMaxImpressions }
            : {}),
          ...(Number.isFinite(parsedDelaySeconds) && parsedDelaySeconds > 0
            ? { delaySeconds: parsedDelaySeconds }
            : {}),
        },
        created_by: user?.id,
      };

      if (editingAd) {
        const { error } = await supabase.from('advertisements').update(adData).eq('id', editingAd.id);
        if (error) throw error;
        Alert.alert('Success', 'Advertisement updated successfully');
      } else {
        const { error } = await supabase.from('advertisements').insert(adData);
        if (error) throw error;
        Alert.alert('Success', 'Advertisement created successfully');
      }

      setShowModal(false);
      loadAds();
      // CRITICAL: Refresh AdContext so ads appear immediately across the app
      await refreshAds();
    } catch (error) {
      console.error('Failed to save ad:', error);
      Alert.alert('Error', 'Failed to save advertisement');
    }
  };

  const buildPreviewUrl = () => {
    if (formData.ctaAction !== 'external_url') {
      return formData.ctaUrl || '';
    }
    if (formData.ctaExternalType === 'whatsapp') {
      const sanitizedNumber = formData.ctaWhatsAppNumber.replace(/[^\d]/g, '');
      if (!sanitizedNumber) return '';
      const message = formData.ctaWhatsAppMessage.trim();
      const query = message ? `?text=${encodeURIComponent(message)}` : '';
      return `https://wa.me/${sanitizedNumber}${query}`;
    }
    const raw = formData.ctaUrl.trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  };

  const previewAd: Advertisement = {
    id: editingAd?.id || 'preview',
    title: formData.title || 'Sponsored Business',
    description: formData.description || '',
    type: formData.type,
    imageUrl: formData.imageUrl || undefined,
    videoUrl: formData.videoUrl || undefined,
    thumbnailUrl: formData.thumbnailUrl || undefined,
    headline: formData.headline || '',
    bodyText: formData.bodyText || '',
    ctaText: formData.ctaText || 'Learn More',
    ctaUrl: buildPreviewUrl() || undefined,
    ctaAction: formData.ctaAction,
    ctaTargetId: formData.ctaTargetId || undefined,
    spend: formData.spend ? parseFloat(formData.spend) : undefined,
    spendCurrency: formData.spendCurrency || 'USD',
    targeting: { scope: formData.targetingScope },
    placement: {
      locations: formData.placementLocations,
      priority: parseInt(formData.placementPriority, 10) || 1,
      frequency: formData.placementFrequency,
      ...(formData.modalDelaySeconds
        ? { delaySeconds: parseInt(formData.modalDelaySeconds, 10) || 0 }
        : {}),
    },
    startDate: formData.startDate || undefined,
    endDate: formData.endDate || undefined,
    timezone: 'Africa/Harare',
    status: formData.status,
    impressionsCount: 0,
    clicksCount: 0,
    conversionsCount: 0,
    createdBy: user?.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleDelete = async (adId: string) => {
    Alert.alert('Delete Advertisement', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('advertisements').delete().eq('id', adId);
            if (error) throw error;
            Alert.alert('Success', 'Advertisement deleted');
            loadAds();
            // CRITICAL: Refresh AdContext so ads are removed immediately across the app
            await refreshAds();
          } catch (error) {
            console.error('Failed to delete ad:', error);
            Alert.alert('Error', 'Failed to delete advertisement');
          }
        },
      },
    ]);
  };

  const handleApproveAd = async (ad: Advertisement) => {
    try {
      let endDate: string | null = null;
      if (ad.adPackageId) {
        const { data: pkg } = await supabase
          .from('ad_packages')
          .select('duration_days')
          .eq('id', ad.adPackageId)
          .single();
        if (pkg?.duration_days) {
          const start = new Date();
          const end = new Date(start);
          end.setDate(start.getDate() + pkg.duration_days);
          endDate = end.toISOString();
        }
      }
      const { error } = await supabase
        .from('advertisements')
        .update({
          status: 'active',
          payment_status: 'approved',
          start_date: new Date().toISOString(),
          end_date: endDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ad.id);
      if (error) throw error;
      Alert.alert('Approved', 'Advertisement approved and activated.');
      loadAds();
      await refreshAds();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve advertisement.');
    }
  };

  const handleRejectAd = async (ad: Advertisement) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({
          status: 'archived',
          payment_status: 'rejected',
          admin_notes: approvalNotes[ad.id] || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ad.id);
      if (error) throw error;
      Alert.alert('Rejected', 'Advertisement rejected.');
      loadAds();
      await refreshAds();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject advertisement.');
    }
  };

  const getCTR = (ad: Advertisement) => {
    if (ad.impressionsCount === 0) return '0.00';
    return ((ad.clicksCount / ad.impressionsCount) * 100).toFixed(2);
  };

  const getConversionRate = (ad: Advertisement) => {
    if (ad.clicksCount === 0) return '0.00';
    return ((ad.conversionsCount / ad.clicksCount) * 100).toFixed(2);
  };

  const getCPC = (ad: Advertisement) => {
    if (!ad.spend || ad.clicksCount === 0) return '—';
    return (ad.spend / ad.clicksCount).toFixed(2);
  };

  const getCPE = (ad: Advertisement) => {
    const engagements = ad.clicksCount + ad.conversionsCount;
    if (!ad.spend || engagements === 0) return '—';
    return (ad.spend / engagements).toFixed(2);
  };

  const getCPA = (ad: Advertisement) => {
    if (!ad.spend || ad.conversionsCount === 0) return '—';
    return (ad.spend / ad.conversionsCount).toFixed(2);
  };

  const getROAS = (ad: Advertisement) => {
    if (!ad.spend || !ad.revenue) return '—';
    return (ad.revenue / ad.spend).toFixed(2);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Advertisement Management</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {ads.length === 0 ? (
          <View style={styles.emptyState}>
            <Megaphone size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No advertisements yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>Create your first ad to get started</Text>
          </View>
        ) : (
          ads.map((ad) => (
            <View key={ad.id} style={[styles.adCard, { backgroundColor: theme.background.card }]}>
              {ad.imageUrl && (
                <Image source={{ uri: ad.imageUrl }} style={styles.adImage} />
              )}
              <View style={styles.adHeader}>
                <View style={styles.adInfo}>
                  <Text style={[styles.adTitle, { color: theme.text.primary }]}>{ad.title}</Text>
                  {ad.headline && <Text style={[styles.adHeadline, { color: theme.text.secondary }]}>{ad.headline}</Text>}
                  <View style={styles.adMeta}>
                    <View style={[styles.badge, { backgroundColor: ad.status === 'active' ? '#10B98120' : '#64748B20' }]}>
                      <Text style={[styles.badgeText, { color: ad.status === 'active' ? '#10B981' : '#64748B' }]}>
                        {ad.status}
                      </Text>
                    </View>
                    <Text style={[styles.adType, { color: theme.text.secondary }]}>{ad.type}</Text>
                  </View>
                </View>
                <View style={styles.adActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                    onPress={() => handleOpenModal(ad)}
                  >
                    <Edit size={18} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                    onPress={() => handleDelete(ad.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.adStats}>
                <View style={styles.stat}>
                  <Eye size={16} color={theme.text.secondary} />
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>{ad.impressionsCount.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Impressions</Text>
                </View>
                <View style={styles.stat}>
                  <MousePointerClick size={16} color={theme.text.secondary} />
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>{ad.clicksCount.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Clicks ({getCTR(ad)}%)</Text>
                </View>
                <View style={styles.stat}>
                  <TrendingUp size={16} color={theme.text.secondary} />
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>{ad.conversionsCount.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Conversions ({getConversionRate(ad)}%)</Text>
                </View>
              </View>
              <View style={styles.adStatsSecondary}>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                  Spend: {ad.spendCurrency || 'USD'} {ad.spend?.toFixed(2) ?? '—'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                  CPC: {ad.spendCurrency || 'USD'} {getCPC(ad)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                  CPE: {ad.spendCurrency || 'USD'} {getCPE(ad)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                  CPA: {ad.spendCurrency || 'USD'} {getCPA(ad)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                  ROAS: {getROAS(ad)}
                </Text>
              </View>

              {ad.status === 'pending' && (
                <View style={styles.approvalSection}>
                  <Text style={[styles.approvalTitle, { color: theme.text.primary }]}>Pending Approval</Text>
                  <Text style={[styles.approvalMeta, { color: theme.text.secondary }]}>
                    Payment: {ad.paymentStatus || 'pending'} · {ad.paymentCurrency || 'USD'} {ad.paymentAmount?.toFixed(2) ?? '—'}
                  </Text>
                  {ad.paymentReference && (
                    <Text style={[styles.approvalMeta, { color: theme.text.tertiary }]}>
                      Reference: {ad.paymentReference}
                    </Text>
                  )}
                  {ad.paymentProofUrl && (
                    <Image source={{ uri: ad.paymentProofUrl }} style={styles.paymentProofImage} />
                  )}
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="Admin notes (optional)"
                    placeholderTextColor={theme.text.tertiary}
                    value={approvalNotes[ad.id] || ''}
                    onChangeText={(text) => setApprovalNotes(prev => ({ ...prev, [ad.id]: text }))}
                  />
                  <View style={styles.approvalActions}>
                    <TouchableOpacity
                      style={[styles.approvalButton, { backgroundColor: theme.surface.info }]}
                      onPress={() => handleApproveAd(ad)}
                    >
                      <Text style={[styles.approvalButtonText, { color: theme.accent.info }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approvalButton, { backgroundColor: theme.surface.danger }]}
                      onPress={() => handleRejectAd(ad)}
                    >
                      <Text style={[styles.approvalButtonText, { color: theme.accent.danger }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Ad Form Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{editingAd ? 'Edit Advertisement' : 'Create Advertisement'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.label, { color: theme.text.secondary }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Advertisement title"
                placeholderTextColor={theme.text.tertiary}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Description"
                placeholderTextColor={theme.text.tertiary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Type</Text>
              <View style={styles.typeButtons}>
                {(['banner', 'card', 'modal', 'inline', 'video'] as AdType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, { backgroundColor: formData.type === type ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.type === type ? '#FFF' : theme.text.primary }]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Ad Image</Text>
              {formData.imageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: formData.imageUrl }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage('imageUrl')}
                  >
                    <X size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePickerButton, { borderColor: theme.accent.primary + '40' }]}
                  onPress={() => handlePickImage('imageUrl')}
                  disabled={isUploadingImage}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[theme.accent.primary + '20', theme.accent.primary + '10']}
                    style={styles.imagePickerGradient}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="large" color={theme.accent.primary} />
                    ) : (
                      <>
                        <Upload size={32} color={theme.accent.primary} />
                        <Text style={[styles.imagePickerButtonText, { color: theme.accent.primary }]}>
                          Upload Ad Image
                        </Text>
                        <Text style={[styles.imagePickerHint, { color: theme.text.tertiary }]}>
                          Recommended: 16:9 aspect ratio
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Text style={[styles.label, { color: theme.text.secondary }]}>Thumbnail (Optional)</Text>
              {formData.thumbnailUrl ? (
                <View style={[styles.imagePreviewContainer, styles.thumbnailPreview]}>
                  <Image source={{ uri: formData.thumbnailUrl }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage('thumbnailUrl')}
                  >
                    <X size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePickerButton, styles.thumbnailPicker, { borderColor: theme.accent.primary + '40' }]}
                  onPress={() => handlePickImage('thumbnailUrl')}
                  disabled={isUploadingImage}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[theme.accent.primary + '20', theme.accent.primary + '10']}
                    style={styles.imagePickerGradient}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="large" color={theme.accent.primary} />
                    ) : (
                      <>
                        <ImageIcon size={24} color={theme.accent.primary} />
                        <Text style={[styles.imagePickerButtonText, { color: theme.accent.primary, fontSize: 13 }]}>
                          Upload Thumbnail
                        </Text>
                        <Text style={[styles.imagePickerHint, { color: theme.text.tertiary, fontSize: 11 }]}>
                          Square format recommended
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Text style={[styles.label, { color: theme.text.secondary }]}>Headline</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Headline"
                placeholderTextColor={theme.text.tertiary}
                value={formData.headline}
                onChangeText={(text) => setFormData({ ...formData, headline: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Body Text</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Body text"
                placeholderTextColor={theme.text.tertiary}
                value={formData.bodyText}
                onChangeText={(text) => setFormData({ ...formData, bodyText: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>CTA Text</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Learn More"
                placeholderTextColor={theme.text.tertiary}
                value={formData.ctaText}
                onChangeText={(text) => setFormData({ ...formData, ctaText: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Spend (Optional)</Text>
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, styles.rowInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  value={formData.spend}
                  onChangeText={(text) => setFormData({ ...formData, spend: text.replace(/[^0-9.]/g, '') })}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.rowInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="USD"
                  placeholderTextColor={theme.text.tertiary}
                  value={formData.spendCurrency}
                  onChangeText={(text) => setFormData({ ...formData, spendCurrency: text.toUpperCase().slice(0, 3) })}
                />
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>CTA Action</Text>
              <View style={styles.typeButtons}>
                {([
                  { key: 'external_url', label: 'Website / WhatsApp' },
                  { key: 'open_product', label: 'Open Product' },
                  { key: 'open_book', label: 'Open Book' },
                  { key: 'open_feature', label: 'Open Feature' },
                ] as Array<{ key: 'external_url' | 'open_product' | 'open_book' | 'open_feature'; label: string }>).map(action => (
                  <TouchableOpacity
                    key={action.key}
                    style={[styles.typeButton, { backgroundColor: formData.ctaAction === action.key ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, ctaAction: action.key })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.ctaAction === action.key ? '#FFF' : theme.text.primary }]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.ctaAction === 'external_url' ? (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>External Type</Text>
                  <View style={styles.typeButtons}>
                    {(['website', 'whatsapp'] as Array<'website' | 'whatsapp'>).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.typeButton, { backgroundColor: formData.ctaExternalType === type ? theme.accent.primary : theme.background.secondary }]}
                        onPress={() => setFormData({ ...formData, ctaExternalType: type })}
                      >
                        <Text style={[styles.typeButtonText, { color: formData.ctaExternalType === type ? '#FFF' : theme.text.primary }]}>
                          {type === 'website' ? 'Website' : 'WhatsApp'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {formData.ctaExternalType === 'website' ? (
                    <>
                      <Text style={[styles.label, { color: theme.text.secondary }]}>CTA URL</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="https://..."
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.ctaUrl}
                        onChangeText={(text) => setFormData({ ...formData, ctaUrl: text })}
                        keyboardType="url"
                      />
                    </>
                  ) : (
                    <>
                      <Text style={[styles.label, { color: theme.text.secondary }]}>WhatsApp Number</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="263771234567"
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.ctaWhatsAppNumber}
                        onChangeText={(text) => setFormData({ ...formData, ctaWhatsAppNumber: text })}
                        keyboardType="phone-pad"
                      />
                      <Text style={[styles.label, { color: theme.text.secondary }]}>WhatsApp Message (Optional)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="Hello, I'm interested in..."
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.ctaWhatsAppMessage}
                        onChangeText={(text) => setFormData({ ...formData, ctaWhatsAppMessage: text })}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Target ID</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="Paste the target ID"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.ctaTargetId}
                    onChangeText={(text) => setFormData({ ...formData, ctaTargetId: text })}
                  />
                </>
              )}

              <Text style={[styles.label, { color: theme.text.secondary }]}>Status</Text>
              <View style={styles.typeButtons}>
                {(['draft', 'pending', 'active', 'paused', 'archived'] as AdStatus[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.typeButton, { backgroundColor: formData.status === status ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.status === status ? '#FFF' : theme.text.primary }]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Targeting</Text>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Scope</Text>
              <View style={styles.typeButtons}>
                {(['global', 'targeted'] as Array<'global' | 'targeted'>).map(scope => (
                  <TouchableOpacity
                    key={scope}
                    style={[styles.typeButton, { backgroundColor: formData.targetingScope === scope ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, targetingScope: scope })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.targetingScope === scope ? '#FFF' : theme.text.primary }]}>
                      {scope}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.targetingScope === 'targeted' && (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Target Books</Text>
                  <View style={styles.locationGrid}>
                    {BOOK_OPTIONS.map(book => {
                      const isSelected = formData.targetBooks.includes(book);
                      return (
                        <TouchableOpacity
                          key={book}
                          style={[
                            styles.locationChip,
                            {
                              backgroundColor: isSelected ? theme.accent.primary + '18' : theme.background.secondary,
                              borderColor: isSelected ? theme.accent.primary : theme.border.light,
                            },
                          ]}
                          onPress={() => {
                            const next = isSelected
                              ? formData.targetBooks.filter(item => item !== book)
                              : [...formData.targetBooks, book];
                            setFormData({ ...formData, targetBooks: next });
                          }}
                        >
                          <Text style={[styles.locationChipText, { color: isSelected ? theme.accent.primary : theme.text.primary }]}>
                            {book.replace(/-/g, ' ')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: theme.text.secondary }]}>Target Business Types</Text>
                  <View style={styles.locationGrid}>
                    {BUSINESS_TYPE_OPTIONS.map(type => {
                      const isSelected = formData.targetBusinessTypes.includes(type);
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.locationChip,
                            {
                              backgroundColor: isSelected ? theme.accent.primary + '18' : theme.background.secondary,
                              borderColor: isSelected ? theme.accent.primary : theme.border.light,
                            },
                          ]}
                          onPress={() => {
                            const next = isSelected
                              ? formData.targetBusinessTypes.filter(item => item !== type)
                              : [...formData.targetBusinessTypes, type];
                            setFormData({ ...formData, targetBusinessTypes: next });
                          }}
                        >
                          <Text style={[styles.locationChipText, { color: isSelected ? theme.accent.primary : theme.text.primary }]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: theme.text.secondary }]}>Target Business Stages</Text>
                  <View style={styles.locationGrid}>
                    {BUSINESS_STAGE_OPTIONS.map(stage => {
                      const isSelected = formData.targetBusinessStages.includes(stage);
                      return (
                        <TouchableOpacity
                          key={stage}
                          style={[
                            styles.locationChip,
                            {
                              backgroundColor: isSelected ? theme.accent.primary + '18' : theme.background.secondary,
                              borderColor: isSelected ? theme.accent.primary : theme.border.light,
                            },
                          ]}
                          onPress={() => {
                            const next = isSelected
                              ? formData.targetBusinessStages.filter(item => item !== stage)
                              : [...formData.targetBusinessStages, stage];
                            setFormData({ ...formData, targetBusinessStages: next });
                          }}
                        >
                          <Text style={[styles.locationChipText, { color: isSelected ? theme.accent.primary : theme.text.primary }]}>
                            {stage}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { color: theme.text.secondary }]}>Target Features (comma-separated ids)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="e.g., products, documents"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.targetFeatures}
                    onChangeText={(text) => setFormData({ ...formData, targetFeatures: text })}
                  />

                  <Text style={[styles.label, { color: theme.text.secondary }]}>Exclude Users (comma-separated user IDs)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="user-id-1, user-id-2"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.excludeUsers}
                    onChangeText={(text) => setFormData({ ...formData, excludeUsers: text })}
                  />
                </>
              )}

              <Text style={[styles.label, { color: theme.text.secondary }]}>Placement Locations</Text>
              <View style={styles.locationControls}>
                <TouchableOpacity
                  style={[styles.locationActionButton, { borderColor: theme.border.light }]}
                  onPress={() => setFormData({ ...formData, placementLocations: LOCATION_OPTIONS.map(option => option.key) })}
                >
                  <Text style={[styles.locationActionText, { color: theme.text.primary }]}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationActionButton, { borderColor: theme.border.light }]}
                  onPress={() => setFormData({ ...formData, placementLocations: [] })}
                >
                  <Text style={[styles.locationActionText, { color: theme.text.primary }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.locationGrid}>
                {LOCATION_OPTIONS.map(option => {
                  const isSelected = formData.placementLocations.includes(option.key);
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.locationChip,
                        {
                          backgroundColor: isSelected ? theme.accent.primary + '18' : theme.background.secondary,
                          borderColor: isSelected ? theme.accent.primary : theme.border.light,
                        },
                      ]}
                      onPress={() => {
                        const next = isSelected
                          ? formData.placementLocations.filter(loc => loc !== option.key)
                          : [...formData.placementLocations, option.key];
                        setFormData({ ...formData, placementLocations: next });
                      }}
                    >
                      <Text style={[styles.locationChipText, { color: isSelected ? theme.accent.primary : theme.text.primary }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Priority</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="1"
                placeholderTextColor={theme.text.tertiary}
                value={formData.placementPriority}
                onChangeText={(text) => setFormData({ ...formData, placementPriority: text.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Frequency</Text>
              <View style={styles.typeButtons}>
                {FREQUENCY_OPTIONS.map((frequency) => (
                  <TouchableOpacity
                    key={frequency}
                    style={[styles.typeButton, { backgroundColor: formData.placementFrequency === frequency ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, placementFrequency: frequency })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.placementFrequency === frequency ? '#FFF' : theme.text.primary }]}>
                      {frequency.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Max Impressions per User (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="e.g., 5"
                placeholderTextColor={theme.text.tertiary}
                value={formData.maxImpressionsPerUser}
                onChangeText={(text) => setFormData({ ...formData, maxImpressionsPerUser: text.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />

              {formData.type === 'modal' && (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Modal Delay (seconds)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="e.g., 3"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.modalDelaySeconds}
                    onChangeText={(text) => setFormData({ ...formData, modalDelaySeconds: text.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                  />
                </>
              )}

              <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Preview</Text>
              <View style={styles.previewCard}>
                <AdCard ad={previewAd} location="admin-preview" preview />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent.primary }]} onPress={handleSave}>
                <Save size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Save</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  adCard: { padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  adHeader: { marginBottom: 16 },
  adInfo: { flex: 1 },
  adTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  adHeadline: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  adMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  adType: { fontSize: 12, textTransform: 'capitalize' },
  adActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  adStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 12, marginTop: 2 },
  adStatsSecondary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  approvalSection: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  approvalTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  approvalMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  approvalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approvalButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  paymentProofImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: {
    minHeight: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { padding: 20, maxHeight: 500 },
  modalBodyContent: { paddingBottom: 56 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 4 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  typeButtons: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  typeButtonText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  rowInput: { flex: 1 },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 4 },
  locationControls: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  locationActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  locationActionText: { fontSize: 12, fontWeight: '600' },
  locationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  locationChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  locationChipText: { fontSize: 12, fontWeight: '600' },
  previewCard: {
    marginTop: 12,
  },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancelButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  adImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12, resizeMode: 'cover' },
  imagePreviewContainer: { 
    position: 'relative', 
    width: '100%', 
    height: 200, 
    borderRadius: 12, 
    overflow: 'hidden', 
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
  },
  thumbnailPreview: {
    height: 150,
    width: 150,
    alignSelf: 'center',
    borderRadius: 12,
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageButton: { 
    position: 'absolute', 
    top: 10, 
    right: 10, 
    backgroundColor: 'rgba(239, 68, 68, 0.9)', 
    borderRadius: 20, 
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  imagePickerButton: { 
    width: '100%', 
    height: 150, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    marginBottom: 12,
    overflow: 'hidden',
  },
  thumbnailPicker: {
    height: 120,
    width: 120,
    alignSelf: 'center',
  },
  imagePickerGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imagePickerButtonText: { 
    fontSize: 15, 
    marginTop: 8, 
    fontWeight: '600',
  },
  imagePickerHint: {
    fontSize: 12,
    marginTop: 4,
  },
});

