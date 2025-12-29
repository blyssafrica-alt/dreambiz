import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Megaphone, TrendingUp, Eye, MousePointerClick, X, Save, Trash2, Edit } from 'lucide-react-native';
import type { Advertisement, AdType, AdStatus } from '@/types/super-admin';

export default function AdsManagementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'banner' as AdType,
    headline: '',
    bodyText: '',
    ctaText: 'Learn More',
    ctaUrl: '',
    status: 'draft' as AdStatus,
    startDate: '',
    endDate: '',
  });

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
      setFormData({
        title: ad.title,
        description: ad.description || '',
        type: ad.type,
        headline: ad.headline || '',
        bodyText: ad.bodyText || '',
        ctaText: ad.ctaText,
        ctaUrl: ad.ctaUrl || '',
        status: ad.status,
        startDate: ad.startDate || '',
        endDate: ad.endDate || '',
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
        status: 'draft',
        startDate: '',
        endDate: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Please fill in title');
      return;
    }

    try {
      const adData: any = {
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        headline: formData.headline || null,
        body_text: formData.bodyText || null,
        cta_text: formData.ctaText,
        cta_url: formData.ctaUrl || null,
        status: formData.status,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        timezone: 'Africa/Harare',
        targeting: { scope: 'global' },
        placement: { locations: ['dashboard'], priority: 1, frequency: 'once_per_session' },
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
    } catch (error) {
      console.error('Failed to save ad:', error);
      Alert.alert('Error', 'Failed to save advertisement');
    }
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
          } catch (error) {
            console.error('Failed to delete ad:', error);
            Alert.alert('Error', 'Failed to delete advertisement');
          }
        },
      },
    ]);
  };

  const getCTR = (ad: Advertisement) => {
    if (ad.impressionsCount === 0) return '0.00';
    return ((ad.clicksCount / ad.impressionsCount) * 100).toFixed(2);
  };

  const getConversionRate = (ad: Advertisement) => {
    if (ad.clicksCount === 0) return '0.00';
    return ((ad.conversionsCount / ad.clicksCount) * 100).toFixed(2);
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

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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

              <Text style={[styles.label, { color: theme.text.secondary }]}>CTA URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="https://..."
                placeholderTextColor={theme.text.tertiary}
                value={formData.ctaUrl}
                onChangeText={(text) => setFormData({ ...formData, ctaUrl: text })}
                keyboardType="url"
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Status</Text>
              <View style={styles.typeButtons}>
                {(['draft', 'active', 'paused', 'archived'] as AdStatus[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.typeButton, { backgroundColor: formData.status === status ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.status === status ? '#FFF' : theme.text.primary }]}>{status}</Text>
                  </TouchableOpacity>
                ))}
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
  adCard: { padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { padding: 20, maxHeight: 500 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 4 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  typeButtons: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  typeButtonText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancelButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
