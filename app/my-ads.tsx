import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert as RNAlert, Modal, TextInput } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Advertisement } from '@/types/super-admin';
import { ArrowLeft, RefreshCcw } from 'lucide-react-native';

export default function MyAdsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [editHeadline, setEditHeadline] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editReference, setEditReference] = useState('');

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
          paymentStatus: row.payment_status || undefined,
          paymentAmount: row.payment_amount ? parseFloat(row.payment_amount) : undefined,
          paymentCurrency: row.payment_currency || 'USD',
          paymentReference: row.payment_reference || undefined,
          paymentProofUrl: row.payment_proof_url || undefined,
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

  const openEditModal = (ad: Advertisement) => {
    setEditingAd(ad);
    setEditHeadline(ad.headline || '');
    setEditBody(ad.bodyText || '');
    setEditCta(ad.ctaText || 'Learn More');
    setEditReference(ad.paymentReference || '');
  };

  const handleResubmit = async () => {
    if (!editingAd || !user) return;
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({
          headline: editHeadline.trim(),
          body_text: editBody.trim() || null,
          cta_text: editCta.trim() || 'Learn More',
          payment_reference: editReference || null,
          status: 'pending',
          payment_status: 'pending',
          admin_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingAd.id)
        .eq('created_by', user.id);
      if (error) throw error;
      setEditingAd(null);
      await loadAds();
      RNAlert.alert('Submitted', 'Your ad has been resubmitted for review.');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to resubmit ad.');
    }
  };

  useEffect(() => {
    loadAds();
  }, [loadAds]);

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
          ads.map(ad => (
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
              <Text style={[styles.metaText, { color: theme.text.secondary }]}>
                Budget: {ad.paymentCurrency || ad.spendCurrency || 'USD'} {ad.paymentAmount?.toFixed(2) ?? ad.spend?.toFixed(2) ?? '—'}
              </Text>
              {ad.paymentReference && (
                <Text style={[styles.metaText, { color: theme.text.tertiary }]}>Ref: {ad.paymentReference}</Text>
              )}
              {ad.status === 'active' && ad.endDate && (
                <Text style={[
                  styles.metaText,
                  { color: formatExpiry(ad.endDate)?.includes('Expires') ? theme.accent.warning : theme.text.tertiary },
                ]}>
                  {formatExpiry(ad.endDate)}
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
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!editingAd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Edit Ad</Text>
              <TouchableOpacity onPress={() => setEditingAd(null)}>
                <Text style={[styles.modalClose, { color: theme.text.secondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
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
                <Text style={styles.saveText}>Resubmit</Text>
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
  label: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  input: { padding: 12, borderRadius: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

