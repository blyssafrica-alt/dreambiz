import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Megaphone, Plus, ExternalLink, Upload, X } from 'lucide-react-native';
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
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';
import { getProductShareUrl, getSupplierStoreShareUrl } from '@/lib/marketplace-sharing';
import * as Linking from 'expo-linking';

type SupplierAdRow = {
  id: string;
  ad_id: string;
  supplier_profile_id: string;
  product_id: string | null;
  placement_key: string | null;
  created_at: string;
  ad?: {
    id: string;
    title: string;
    headline: string | null;
    image_url: string | null;
    status: string;
    payment_status: string | null;
    start_date: string | null;
    end_date: string | null;
  };
};

export default function SupplierAdsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [list, setList] = useState<SupplierAdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [packages, setPackages] = useState<{ id: string; name: string; price: number; currency: string }[]>([]);
  const [title, setTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [ctaText, setCtaText] = useState('Visit store');
  const [ctaUrl, setCtaUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [profileData, setProfileData] = useState<{ phone?: string; whatsapp?: string; website?: string; email?: string; address?: string; city?: string; country?: string } | null>(null);

  const insets = useSafeAreaInsets();
  const fabBottom = Math.max(insets.bottom, 16) + 20;
  const scrollBottomPadding = Math.max(insets.bottom + 80, 100);

  const CTA_OPTIONS = [
    { type: 'visit_store', label: 'Visit store' },
    { type: 'location', label: 'Location' },
    { type: 'whatsapp', label: 'WhatsApp' },
    { type: 'call', label: 'Call' },
    { type: 'email', label: 'Email' },
    { type: 'website', label: 'Website' },
  ];

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      if (!profile) {
        setLoading(false);
        return;
      }
      setProfileId(profile.id);

      const { data: links } = await supabase.from('supplier_ads').select('id, ad_id, supplier_profile_id, product_id, placement_key, created_at').eq('supplier_profile_id', profile.id).order('created_at', { ascending: false });
      if (links && links.length > 0) {
        const adIds = links.map((l: any) => l.ad_id);
        const { data: ads } = await supabase.from('advertisements').select('id, title, headline, image_url, status, payment_status, start_date, end_date').in('id', adIds);
        const adMap: Record<string, any> = {};
        (ads || []).forEach((a: any) => { adMap[a.id] = a; });
        setList(
          (links as SupplierAdRow[]).map((l) => ({
            ...l,
            ad: adMap[l.ad_id],
          }))
        );
      } else {
        setList([]);
      }

      const { data: pkgs } = await supabase.from('ad_packages').select('id, name, price, currency').eq('is_active', true).order('display_order', { ascending: true });
      if (pkgs) setPackages(pkgs.map((p: any) => ({ id: p.id, name: p.name, price: parseFloat(p.price), currency: p.currency || 'USD' })));
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const openCreate = async () => {
    setTitle('');
    setHeadline('');
    setBodyText('');
    setCtaText('Visit store');
    setCtaUrl('');
    setImageUrl(null);
    setSelectedPackageId(packages[0]?.id || null);
    setPaymentRef('');
    setProofUrl(null);
    setModalOpen(true);
    if (profileId) {
      const [prodsRes, profileRes] = await Promise.all([
        supabase.from('supplier_marketplace_products').select('id, name').eq('supplier_profile_id', profileId).eq('status', 'published').order('name'),
        supabase.from('supplier_marketplace_profiles').select('phone, whatsapp, website, email, address, city, country').eq('id', profileId).single(),
      ]);
      if (prodsRes.data) setProducts(prodsRes.data as { id: string; name: string }[]);
      const prof = profileRes.data as any;
      setProfileData(prof ?? null);
      if (profileId) setCtaUrl(Linking.createURL(`suppliers-marketplace/${profileId}`));
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please allow access to photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setUploadingImage(true);
      try {
        const base64 = await getBase64FromAsset(asset);
        const fileName = buildAssetFileName(asset, 'supplier-ad');
        const filePath = `ad_images/${fileName}`;
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
        const contentType = mimeMap[ext] || 'image/jpeg';
        const url = await uploadBase64ToStorage(supabase, { bucket: 'ad_images', filePath, base64, contentType, upsert: false });
        setImageUrl(url);
      } catch (e: any) {
        RNAlert.alert('Upload failed', e?.message || 'Could not upload image.');
      } finally {
        setUploadingImage(false);
      }
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to pick image');
    }
  };

  const pickProof = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please allow access to photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setUploadingProof(true);
      try {
        const base64 = await getBase64FromAsset(asset);
        const fileName = buildAssetFileName(asset, 'supplier-ad-proof');
        const filePath = `ad_payment_proofs/${fileName}`;
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
        const contentType = mimeMap[ext] || 'image/jpeg';
        const url = await uploadBase64ToStorage(supabase, { bucket: 'ad_payment_proofs', filePath, base64, contentType, upsert: false });
        setProofUrl(url);
      } catch (e: any) {
        RNAlert.alert('Upload failed', e?.message || 'Could not upload proof.');
      } finally {
        setUploadingProof(false);
      }
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to pick image');
    }
  };

  const submitAd = async () => {
    if (!profileId || !user?.id) return;
    const trimmedTitle = title.trim();
    const trimmedHeadline = headline.trim();
    if (!trimmedTitle || !trimmedHeadline) {
      RNAlert.alert('Required', 'Title and headline are required.');
      return;
    }
    if (!proofUrl) {
      RNAlert.alert('Required', 'Please upload proof of payment.');
      return;
    }
    const pkg = packages.find((p) => p.id === selectedPackageId);
    const amount = pkg?.price ?? 0;
    const currency = pkg?.currency ?? 'USD';
    setSubmitting(true);
    try {
      const { data: ad, error: adError } = await supabase
        .from('advertisements')
        .insert({
          title: trimmedTitle,
          description: bodyText.trim() || null,
          type: 'card',
          image_url: imageUrl || null,
          headline: trimmedHeadline,
          body_text: bodyText.trim() || null,
          cta_text: ctaText.trim() || 'Visit store',
          cta_url: ctaUrl.trim() || null,
          cta_action: 'external_url',
          status: 'pending',
          payment_status: 'pending',
          payment_amount: amount,
          payment_currency: currency,
          payment_reference: paymentRef.trim() || null,
          payment_proof_url: proofUrl,
          ad_package_id: selectedPackageId || null,
          targeting: { scope: 'global' },
          placement: { locations: ['suppliers_marketplace'], priority: 1, frequency: 'once_per_day' },
          created_by: user.id,
        })
        .select('id')
        .single();
      if (adError) throw adError;
      if (!ad) throw new Error('No ad returned');

      const { error: linkError } = await supabase.from('supplier_ads').insert({
        ad_id: ad.id,
        supplier_profile_id: profileId,
        placement_key: 'supplier_store',
      });
      if (linkError) throw linkError;

      RNAlert.alert('Submitted', 'Your ad has been submitted for approval. You can also manage it under My Ads.');
      setModalOpen(false);
      refreshList();
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to create ad');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshList = async () => {
    if (!profileId) return;
    const { data: links } = await supabase.from('supplier_ads').select('id, ad_id, supplier_profile_id, product_id, placement_key, created_at').eq('supplier_profile_id', profileId).order('created_at', { ascending: false });
    if (links && links.length > 0) {
      const adIds = links.map((l: any) => l.ad_id);
      const { data: ads } = await supabase.from('advertisements').select('id, title, headline, image_url, status, payment_status, start_date, end_date').in('id', adIds);
      const adMap: Record<string, any> = {};
      (ads || []).forEach((a: any) => { adMap[a.id] = a; });
      setList(
        (links as SupplierAdRow[]).map((l) => ({
          ...l,
          ad: adMap[l.ad_id],
        }))
      );
    } else {
      setList([]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!profileId) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.primary }]}>
        <Text style={{ color: theme.text.secondary }}>No approved supplier profile.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <PageHeader
        title="Supplier Ads"
        subtitle="Promote your store"
        icon={Megaphone}
        iconGradient={['#EC4899', '#DB2777']}
        showLogo={false}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={openCreate} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Plus size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.background.card }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.accent.primary + '18' }]}>
              <Megaphone size={48} color={theme.accent.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No ads yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.text.secondary }]}>Create an ad to promote your store in the marketplace</Text>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.accent.primary }]} onPress={openCreate}>
              <Plus size={20} color="#FFF" />
              <Text style={styles.createBtnText}>Create ad</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.manageLink, { borderColor: theme.border.medium }]} onPress={() => router.push('/my-ads' as any)}>
              <ExternalLink size={16} color={theme.accent.primary} />
              <Text style={[styles.manageLinkText, { color: theme.accent.primary }]}>Manage all ads</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={[styles.manageCard, { backgroundColor: theme.accent.primary + '12' }]} onPress={() => router.push('/my-ads' as any)}>
              <ExternalLink size={20} color={theme.accent.primary} />
              <Text style={[styles.manageCardText, { color: theme.accent.primary }]}>Manage all ads</Text>
              <ChevronRight size={20} color={theme.accent.primary} />
            </TouchableOpacity>
            {list.map((row) => (
              <TouchableOpacity key={row.id} style={[styles.card, { backgroundColor: theme.background.card }]} onPress={() => router.push('/my-ads' as any)} activeOpacity={0.85}>
                {row.ad?.image_url ? <Image source={{ uri: row.ad.image_url }} style={styles.adThumb} /> : <View style={[styles.adThumb, styles.adThumbPlaceholder]}><Megaphone size={24} color={theme.text.tertiary} /></View>}
                <View style={styles.cardBody}>
                  <Text style={[styles.adTitle, { color: theme.text.primary }]}>{row.ad?.title ?? 'Ad'}</Text>
                  <Text style={[styles.adStatus, { color: theme.text.tertiary }]}>{row.ad?.status ?? '—'} · payment {row.ad?.payment_status ?? '—'}</Text>
                </View>
                <ChevronRight size={20} color={theme.text.tertiary} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent.primary, right: 20, bottom: fabBottom }]}
        onPress={openCreate}
        activeOpacity={0.9}
      >
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalBox, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Create supplier ad</Text>

              <View style={[styles.formSection, { backgroundColor: theme.background.secondary + '80' }]}>
                <Text style={[styles.formSectionTitle, { color: theme.text.secondary }]}>Ad content</Text>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Title *</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background.primary, color: theme.text.primary, borderWidth: 1, borderColor: theme.border?.light || '#E5E7EB' }]} placeholder="Ad title" placeholderTextColor={theme.text.tertiary} value={title} onChangeText={setTitle} />
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Headline *</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background.primary, color: theme.text.primary, borderWidth: 1, borderColor: theme.border?.light || '#E5E7EB' }]} placeholder="Short headline" placeholderTextColor={theme.text.tertiary} value={headline} onChangeText={setHeadline} />
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Body text</Text>
                <TextInput style={[styles.input, styles.inputArea, { backgroundColor: theme.background.primary, color: theme.text.primary, borderWidth: 1, borderColor: theme.border?.light || '#E5E7EB' }]} placeholder="Description" placeholderTextColor={theme.text.tertiary} value={bodyText} onChangeText={setBodyText} multiline />
              </View>

              <View style={[styles.formSection, { backgroundColor: theme.background.secondary + '80' }]}>
                <Text style={[styles.formSectionTitle, { color: theme.text.secondary }]}>Call-to-action</Text>
              <View style={styles.ctaRow}>
                {CTA_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.ctaChip, ctaText === opt.label && { backgroundColor: theme.accent.primary }]}
                    onPress={() => {
                      setCtaText(opt.label);
                      if (!profileId) return;
                      if (opt.type === 'visit_store') setCtaUrl(Linking.createURL(`suppliers-marketplace/${profileId}`));
                      else if (opt.type === 'location' && (profileData?.address || profileData?.city || profileData?.country)) {
                        const addr = [profileData.address, profileData.city, profileData.country].filter(Boolean).join(', ');
                        setCtaUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`);
                      } else if (opt.type === 'whatsapp' && profileData?.whatsapp) setCtaUrl(`https://wa.me/${profileData.whatsapp.replace(/\D/g, '')}`);
                      else if (opt.type === 'call' && profileData?.phone) setCtaUrl(`tel:${profileData.phone}`);
                      else if (opt.type === 'email' && profileData?.email) setCtaUrl(`mailto:${profileData.email}`);
                      else if (opt.type === 'website' && profileData?.website) setCtaUrl(profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`);
                      else setCtaUrl('');
                    }}
                  >
                    <Text style={[styles.ctaChipText, { color: ctaText === opt.label ? '#FFF' : theme.text.secondary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: theme.text.tertiary }]}>CTA URL (optional)</Text>
              <View style={styles.ctaUrlRow}>
                <TextInput
                  style={[styles.input, styles.ctaUrlInput, { backgroundColor: theme.background.primary, color: theme.text.primary, borderWidth: 1, borderColor: theme.border?.light || '#E5E7EB' }]}
                  placeholder="Store or product link"
                  placeholderTextColor={theme.text.tertiary}
                  value={ctaUrl}
                  onChangeText={setCtaUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                />
                {products.length > 0 && (
                  <TouchableOpacity
                    style={[styles.pickProductBtn, { backgroundColor: theme.surface.info }]}
                    onPress={() => {
                      RNAlert.alert(
                        'Pick product',
                        'Select a product to link',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          ...products.map((pr) => ({
                            text: pr.name.length > 30 ? pr.name.slice(0, 27) + '…' : pr.name,
                            onPress: () => setCtaUrl(Linking.createURL(`suppliers-marketplace/product/${pr.id}`)),
                          })),
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.pickProductBtnText, { color: theme.accent.primary }]}>Pick product</Text>
                  </TouchableOpacity>
                )}
              </View>
              </View>

              <View style={[styles.formSection, { backgroundColor: theme.background.secondary + '80' }]}>
                <Text style={[styles.formSectionTitle, { color: theme.text.secondary }]}>Media & package</Text>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Image</Text>
              {imageUrl ? (
                <View style={styles.imageRow}>
                  <Image source={{ uri: imageUrl }} style={styles.thumb} />
                  <TouchableOpacity onPress={() => setImageUrl(null)}><X size={24} color={theme.text.secondary} /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[styles.uploadArea, { borderColor: theme.text.tertiary }]} onPress={pickImage} disabled={uploadingImage}>
                  {uploadingImage ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <><Upload size={24} color={theme.accent.primary} /><Text style={[styles.uploadText, { color: theme.text.tertiary }]}>Add image</Text></>}
                </TouchableOpacity>
              )}
              <Text style={[styles.label, { color: theme.text.tertiary }]}>Package</Text>
              <View style={styles.packageRow}>
                {packages.map((p) => (
                  <TouchableOpacity key={p.id} style={[styles.packageChip, selectedPackageId === p.id && { backgroundColor: theme.accent.primary }]} onPress={() => setSelectedPackageId(p.id)}>
                    <Text style={[styles.packageChipText, { color: selectedPackageId === p.id ? '#FFF' : theme.text.secondary }]}>{p.name} ({p.currency} {p.price})</Text>
                  </TouchableOpacity>
                ))}
              </View>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Payment reference</Text>
                <TextInput style={[styles.input, { backgroundColor: theme.background.primary, color: theme.text.primary, borderWidth: 1, borderColor: theme.border?.light || '#E5E7EB' }]} placeholder="Optional ref" placeholderTextColor={theme.text.tertiary} value={paymentRef} onChangeText={setPaymentRef} />
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Proof of payment *</Text>
              {proofUrl ? (
                <View style={styles.imageRow}>
                  <Image source={{ uri: proofUrl }} style={styles.thumb} />
                  <TouchableOpacity onPress={() => setProofUrl(null)}><X size={24} color={theme.text.secondary} /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[styles.uploadArea, { borderColor: theme.text.tertiary }]} onPress={pickProof} disabled={uploadingProof}>
                  {uploadingProof ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <><Upload size={24} color={theme.accent.primary} /><Text style={[styles.uploadText, { color: theme.text.tertiary }]}>Upload proof</Text></>}
                </TouchableOpacity>
              )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setModalOpen(false)}>
                  <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.accent.primary }]} onPress={submitAd} disabled={submitting}>
                  {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Submit</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  emptyState: { padding: 28, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  manageLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  manageLinkText: { fontSize: 14, fontWeight: '600' },
  manageCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 12 },
  manageCardText: { flex: 1, fontSize: 15, fontWeight: '600' },
  card: { padding: 16, borderRadius: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardBody: { flex: 1, marginLeft: 12 },
  adThumb: { width: 56, height: 56, borderRadius: 8 },
  adThumbPlaceholder: { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  adTitle: { fontSize: 16, fontWeight: '600' },
  adStatus: { fontSize: 12, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  createBtnText: { color: '#FFF', fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalScroll: { width: '100%', maxHeight: '90%' },
  modalScrollContent: { paddingBottom: 48 },
  modalBox: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  formSection: { padding: 16, borderRadius: 12, marginBottom: 16 },
  formSectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  ctaChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  ctaChipText: { fontSize: 14, fontWeight: '600' },
  ctaUrlRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  ctaUrlInput: { flex: 1 },
  pickProductBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  pickProductBtnText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  input: { padding: 12, borderRadius: 10, fontSize: 15 },
  inputArea: { minHeight: 60, textAlignVertical: 'top' },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  uploadArea: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 6 },
  uploadText: { marginTop: 6, fontSize: 14 },
  packageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  packageChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  packageChipText: { fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
  fab: { position: 'absolute', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
});
