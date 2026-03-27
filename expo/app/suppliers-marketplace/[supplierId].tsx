import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Truck, UserPlus, UserMinus, Phone, Mail, ExternalLink, Star, MessageSquare, AlertTriangle, Upload, X, Globe, ShieldCheck, FileText, Bookmark, Heart, Clock, Search, LayoutGrid, List, SlidersHorizontal, Package, Share2, Pencil, Trash2 } from 'lucide-react-native';
import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert as RNAlert, Linking, Modal, TextInput, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StorageImage } from '@/components/StorageImage';
import { VerificationBadge } from '@/components/VerificationBadge';
import * as ImagePicker from 'expo-image-picker';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { getSupplierStoreShareUrl } from '@/lib/marketplace-sharing';
import { supabase } from '@/lib/supabase';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';
import { recordSupplierEvent } from '@/lib/supplier-analytics';
import { sendNotification } from '@/lib/notifications';
import { useCreateRfq } from '@/hooks/useSupplierRfq';
import { useSavedSuppliers, useFollowedSuppliers, useToggleSavedSupplier, useToggleFollowSupplier, useSupplierFollowerCount } from '@/hooks/useBuyerRetention';
import type { SupplierMarketplaceProfile, SupplierMarketplaceProduct } from '@/types/supplier-marketplace';

type ReviewRow = {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

function mapProduct(r: any): SupplierMarketplaceProduct {
  return {
    id: r.id,
    supplierProfileId: r.supplier_profile_id,
    subcategoryId: r.subcategory_id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    shortDescription: r.short_description,
    imageUrls: Array.isArray(r.image_urls) ? r.image_urls : [],
    price: r.price != null ? Number(r.price) : null,
    currency: r.currency || 'USD',
    minOrderQty: r.min_order_qty ?? 1,
    availabilityStatus: r.availability_status || 'in_stock',
    status: r.status,
    featured: r.featured ?? false,
    adminNotes: r.admin_notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export default function SupplierStorefrontScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { suppliers, addSupplierFromMarketplace, removeSupplierFromMarketplace } = useBusiness();
  const params = useLocalSearchParams<{ supplierId: string | string[]; openRfq?: string; productId?: string | string[] }>();
  const supplierId = typeof params.supplierId === 'string' ? params.supplierId : params.supplierId?.[0];
  const initialRfqProductId = (typeof params.productId === 'string' ? params.productId : params.productId?.[0]) ?? null;
  const shouldOpenRfq = params.openRfq === '1';
  const isInMySuppliers = Boolean(supplierId && (suppliers ?? []).some(s => s.marketplaceSupplierId === supplierId));
  const { user } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const createRfq = useCreateRfq(user?.id);
  const { data: savedSupplierIds = [] } = useSavedSuppliers(user?.id);
  const { data: followedSupplierIds = [] } = useFollowedSuppliers(user?.id);
  const toggleSaved = useToggleSavedSupplier(user?.id);
  const toggleFollow = useToggleFollowSupplier(user?.id);
  const isSaved = supplierId ? savedSupplierIds.includes(supplierId) : false;
  const isFollowed = supplierId ? followedSupplierIds.includes(supplierId) : false;
  const { data: followerCount = 0 } = useSupplierFollowerCount(supplierId ?? undefined);
  const [profile, setProfile] = useState<SupplierMarketplaceProfile | null>(null);
  const [products, setProducts] = useState<SupplierMarketplaceProduct[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [myReview, setMyReview] = useState<ReviewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToSuppliers, setAddingToSuppliers] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintOrderRef, setComplaintOrderRef] = useState('');
  const [complaintEvidenceUrls, setComplaintEvidenceUrls] = useState<string[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [rfqModalVisible, setRfqModalVisible] = useState(false);
  const [rfqQuantity, setRfqQuantity] = useState('1');
  const [rfqUnit, setRfqUnit] = useState('');
  const [rfqDeliveryLocation, setRfqDeliveryLocation] = useState('');
  const [rfqNeededByDate, setRfqNeededByDate] = useState('');
  const [rfqNotes, setRfqNotes] = useState('');
  const [rfqProductId, setRfqProductId] = useState<string | null>(null);
  const profileViewRecorded = useRef(false);
  const canRequestQuote = isFeatureVisible('supplier-rfq');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [productSortBy, setProductSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'name'>('newest');
  const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('list');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!supplierId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const [profileRes, productsRes, reviewsRes, subcatsRes] = await Promise.all([
        supabase
          .from('supplier_marketplace_profiles')
          .select('*')
          .eq('id', supplierId)
          .eq('status', 'approved')
          .single(),
        supabase
          .from('supplier_marketplace_products')
          .select('*')
          .eq('supplier_profile_id', supplierId)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('supplier_marketplace_reviews')
          .select('id, user_id, rating, title, body, created_at')
          .eq('supplier_profile_id', supplierId)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('supplier_marketplace_subcategories')
          .select('id, name')
          .eq('supplier_profile_id', supplierId)
          .in('status', ['approved', 'pending'])
          .order('name'),
      ]);
      if (profileRes.error || !profileRes.data) {
        setLoading(false);
        return;
      }
      const r = profileRes.data as any;
      setProfile({
        id: r.id,
        userId: r.user_id,
        businessName: r.business_name,
        slug: r.slug,
        categoryFocus: r.category_focus,
        country: r.country,
        city: r.city,
        region: r.region,
        address: r.address,
        email: r.email,
        companyEmail: r.company_email ?? null,
        phone: r.phone,
        whatsapp: r.whatsapp,
        website: r.website ?? null,
        description: r.description,
        logoUrl: r.logo_url,
        coverUrl: r.cover_url,
        status: r.status,
        verificationLevel: r.verification_level ?? 0,
        verificationBadgeText: r.verification_badge_text,
        verificationTier: r.verification_tier ?? null,
        trustScore: r.trust_score ?? 0,
        featured: r.featured ?? false,
        adminNotes: r.admin_notes,
        avgResponseHours: r.avg_response_hours != null ? Number(r.avg_response_hours) : null,
        firstSupplierReplyAt: r.first_supplier_reply_at ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
      if (productsRes.data) setProducts(productsRes.data.map(mapProduct));
      if (reviewsRes.data) setReviews(reviewsRes.data as ReviewRow[]);
      if (subcatsRes.data) setSubcategories(subcatsRes.data.map((r: any) => ({ id: r.id, name: r.name || r.id })));
      setLoading(false);
    };
    load();
  }, [supplierId]);

  const SORT_OPTIONS = [
    { key: 'newest' as const, label: 'Newest' },
    { key: 'price_asc' as const, label: 'Price ↑' },
    { key: 'price_desc' as const, label: 'Price ↓' },
    { key: 'name' as const, label: 'Name A–Z' },
  ];

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchesSearch =
        !productSearchQuery.trim() ||
        (p.name || '').toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        (p.shortDescription || '').toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(productSearchQuery.toLowerCase());
      const matchesCategory = !selectedSubcategoryId || p.subcategoryId === selectedSubcategoryId;
      return matchesSearch && matchesCategory;
    });
    switch (productSortBy) {
      case 'price_asc':
        list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        break;
      case 'price_desc':
        list = [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
        break;
      case 'name':
        list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      default:
        list = [...list].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return list;
  }, [products, productSearchQuery, selectedSubcategoryId, productSortBy]);

  useEffect(() => {
    if (!supplierId || !profile || profileViewRecorded.current) return;
    profileViewRecorded.current = true;
    recordSupplierEvent(supplierId, 'profile_view', { userId: user?.id ?? undefined });
  }, [supplierId, profile, user?.id]);

  const rfqAutoOpened = useRef(false);
  useEffect(() => {
    if (shouldOpenRfq && initialRfqProductId && products.length > 0 && !rfqModalVisible && !rfqAutoOpened.current) {
      rfqAutoOpened.current = true;
      setRfqProductId(initialRfqProductId);
      setRfqModalVisible(true);
    }
  }, [shouldOpenRfq, initialRfqProductId, products.length, rfqModalVisible]);

  useEffect(() => {
    if (!supplierId || !user?.id) {
      setMyReview(null);
      return;
    }
    const loadMyReview = async () => {
      const { data } = await supabase
        .from('supplier_marketplace_reviews')
        .select('id, rating, title, body, created_at')
        .eq('supplier_profile_id', supplierId)
        .eq('user_id', user.id)
        .maybeSingle();
      setMyReview(data ? (data as ReviewRow) : null);
    };
    loadMyReview();
  }, [supplierId, user?.id]);

  const handleAddToMySuppliers = async () => {
    if (!supplierId || !profile) return;
    setAddingToSuppliers(true);
    try {
      await addSupplierFromMarketplace(supplierId);
      RNAlert.alert('Added', `${profile.businessName} has been added to My Suppliers. You can find them in More → Suppliers → My Suppliers.`);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not add to My Suppliers.');
    } finally {
      setAddingToSuppliers(false);
    }
  };

  const handleRemoveFromMySuppliers = async () => {
    if (!supplierId || !profile) return;
    RNAlert.alert(
      'Remove supplier',
      `Remove ${profile.businessName} from My Suppliers? You can add them again anytime from their store.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setAddingToSuppliers(true);
            try {
              await removeSupplierFromMarketplace(supplierId);
              RNAlert.alert('Removed', `${profile.businessName} has been removed from My Suppliers.`);
            } catch (e: any) {
              RNAlert.alert('Error', e?.message || 'Could not remove from My Suppliers.');
            } finally {
              setAddingToSuppliers(false);
            }
          },
        },
      ]
    );
  };

  const openPhone = () => {
    if (profile?.phone) {
      recordSupplierEvent(supplierId!, 'contact_call', { userId: user?.id });
      Linking.openURL(`tel:${profile.phone}`);
    }
  };
  const openEmail = () => {
    if (profile?.email) {
      recordSupplierEvent(supplierId!, 'contact_email', { userId: user?.id });
      Linking.openURL(`mailto:${profile.email}`);
    }
  };
  const openWhatsApp = () => {
    if (profile?.whatsapp) {
      recordSupplierEvent(supplierId!, 'contact_whatsapp', { userId: user?.id });
      Linking.openURL(`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`);
    }
  };
  const openWebsite = () => {
    if (profile?.website) {
      let url = profile.website.trim();
      if (!url.startsWith('http')) url = `https://${url}`;
      recordSupplierEvent(supplierId!, 'contact_website', { userId: user?.id });
      Linking.openURL(url);
    }
  };

  const openReviewModal = () => {
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewTitle(myReview.title || '');
      setReviewBody(myReview.body || '');
    } else {
      setReviewRating(5);
      setReviewTitle('');
      setReviewBody('');
    }
    setReviewModalVisible(true);
  };

  const handleDeleteReview = (r: ReviewRow) => {
    RNAlert.alert('Delete review', 'Remove your review? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id || !supplierId) return;
          try {
            const { error } = await supabase.from('supplier_marketplace_reviews').delete().eq('id', r.id).eq('user_id', user.id);
            if (error) throw error;
            setReviews((prev) => prev.filter((x) => x.id !== r.id));
            if (myReview?.id === r.id) setMyReview(null);
            RNAlert.alert('Deleted', 'Your review has been removed.');
          } catch (e: any) {
            RNAlert.alert('Error', e?.message || 'Could not delete review.');
          }
        },
      },
    ]);
  };

  const submitReview = async () => {
    if (!supplierId || !user?.id) {
      RNAlert.alert('Sign in', 'You need to be signed in to leave a review.');
      return;
    }
    setSubmittingReview(true);
    try {
      if (myReview) {
        const { error } = await supabase.from('supplier_marketplace_reviews').update({ rating: reviewRating, title: reviewTitle.trim() || null, body: reviewBody.trim() || null, updated_at: new Date().toISOString() }).eq('id', myReview.id).eq('user_id', user.id);
        if (error) throw error;
        setMyReview({ ...myReview, rating: reviewRating, title: reviewTitle.trim() || null, body: reviewBody.trim() || null, created_at: myReview.created_at });
        setReviews((prev) => prev.map((r) => (r.id === myReview.id ? { ...r, rating: reviewRating, title: reviewTitle.trim() || null, body: reviewBody.trim() || null } : r)));
        RNAlert.alert('Updated', 'Your review has been updated.');
      } else {
        const { data: inserted, error } = await supabase.from('supplier_marketplace_reviews').insert({ supplier_profile_id: supplierId, user_id: user.id, rating: reviewRating, title: reviewTitle.trim() || null, body: reviewBody.trim() || null }).select('id, rating, title, body, created_at').single();
        if (error) throw error;
        const newR = inserted as ReviewRow;
        setMyReview(newR);
        setReviews((prev) => [newR, ...prev]);
        RNAlert.alert('Thanks', 'Your review has been posted.');
      }
      setReviewModalVisible(false);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not save review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const openComplaintModal = () => {
    setComplaintSubject('');
    setComplaintDescription('');
    setComplaintOrderRef('');
    setComplaintEvidenceUrls([]);
    setComplaintModalVisible(true);
  };

  const pickComplaintEvidence = async () => {
    if (!user) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please allow access to photos to attach evidence.');
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
      setUploadingEvidence(true);
      try {
        const base64 = await getBase64FromAsset(asset);
        const fileName = buildAssetFileName(asset, 'complaint-evidence');
        const filePath = `supplier_complaint_evidence/${Date.now()}-${fileName}`;
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
        const contentType = mimeMap[ext] || 'image/jpeg';
        const url = await uploadBase64ToStorage(supabase, { bucket: 'payment_proofs', filePath, base64, contentType, upsert: false });
        setComplaintEvidenceUrls((prev) => [...prev, url]);
      } catch (e: any) {
        RNAlert.alert('Upload failed', e?.message || 'Could not upload image.');
      } finally {
        setUploadingEvidence(false);
      }
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Failed to pick image');
    }
  };

  const submitComplaint = async () => {
    if (!supplierId || !user?.id) {
      RNAlert.alert('Sign in', 'You need to be signed in to file a complaint.');
      return;
    }
    const subj = complaintSubject.trim();
    const desc = complaintDescription.trim();
    if (!subj) {
      RNAlert.alert('Required', 'Please enter a subject.');
      return;
    }
    if (!desc) {
      RNAlert.alert('Required', 'Please describe the issue.');
      return;
    }
    setSubmittingComplaint(true);
    try {
      const { error } = await supabase.from('supplier_marketplace_complaints').insert({
        supplier_profile_id: supplierId,
        user_id: user.id,
        subject: subj,
        description: desc,
        order_reference: complaintOrderRef.trim() || null,
        evidence_urls: complaintEvidenceUrls.length > 0 ? complaintEvidenceUrls : [],
      });
      if (error) throw error;
      RNAlert.alert('Submitted', 'Your complaint has been submitted. Our team will review it.');
      setComplaintModalVisible(false);
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not submit complaint.');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const handleShareStore = async () => {
    if (!profile || !supplierId) return;
    try {
      const shareUrl = getSupplierStoreShareUrl(supplierId);
      const location = [profile.city, profile.country].filter(Boolean).join(', ');
      const message = [profile.businessName, profile.description ? profile.description.substring(0, 120).trim() + '...' : null, location, shareUrl].filter(Boolean).join('\n\n');
      await Share.share({
        title: `${profile.businessName} | DreamBiz Suppliers`,
        message,
        url: shareUrl,
      });
    } catch {
      // User cancelled
    }
  };

  const openRfqModal = (productId?: string) => {
    setRfqProductId(productId ?? null);
    setRfqQuantity('1');
    setRfqUnit('');
    setRfqDeliveryLocation('');
    setRfqNeededByDate('');
    setRfqNotes('');
    setRfqModalVisible(true);
  };

  const submitRfq = async () => {
    if (!supplierId || !user?.id || !profile) {
      RNAlert.alert('Sign in', 'You need to be signed in to request a quote.');
      return;
    }
    const qty = parseFloat(rfqQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      RNAlert.alert('Required', 'Please enter a valid quantity.');
      return;
    }
    try {
      await createRfq.mutateAsync({
        supplier_profile_id: supplierId,
        product_id: rfqProductId || undefined,
        buyer_user_id: user.id,
        quantity: qty,
        unit: rfqUnit.trim() || undefined,
        delivery_location: rfqDeliveryLocation.trim() || undefined,
        needed_by_date: rfqNeededByDate.trim() || undefined,
        notes: rfqNotes.trim() || undefined,
      });
      recordSupplierEvent(supplierId, 'rfq_created', { userId: user?.id });
      sendNotification({
        title: 'New request for quote',
        message: `A buyer requested a quote from ${profile.businessName}. Check your Inbox → RFQs.`,
        userId: profile.userId,
      }).catch(() => {});
      setRfqModalVisible(false);
      RNAlert.alert('Sent', 'Your request for quote has been sent. The supplier will respond via the marketplace.');
    } catch (e: any) {
      RNAlert.alert('Error', e?.message || 'Could not submit request.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text.secondary }}>Supplier not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.primary }]} edges={['top']}>
      <View style={styles.heroWrap}>
        <StorageImage uri={profile.coverUrl} bucket="supplier" style={styles.heroCover} resizeMode="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.heroGradient} />
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.heroBack}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShareStore} style={styles.heroShare}>
            <Share2 size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.heroTitleRow}>
            <StorageImage uri={profile.logoUrl} bucket="supplier" style={styles.heroLogo} containerStyle={styles.heroLogoWrap} resizeMode="contain" />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle} numberOfLines={2}>{profile.businessName}</Text>
              <Text style={styles.heroSubtitle}>
                {[profile.city, profile.country].filter(Boolean).join(', ') || 'Verified supplier'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.actionsRow, { backgroundColor: theme.background.card }]}>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: isInMySuppliers ? (theme.text.tertiary ?? '#6B7280') : theme.accent.primary },
            ]}
            onPress={isInMySuppliers ? handleRemoveFromMySuppliers : handleAddToMySuppliers}
            disabled={addingToSuppliers}
          >
            {addingToSuppliers ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                {isInMySuppliers ? (
                  <UserMinus size={18} color="#FFF" />
                ) : (
                  <UserPlus size={18} color="#FFF" />
                )}
                <Text style={styles.addButtonText}>
                  {isInMySuppliers ? 'Remove from My Suppliers' : 'Add to My Suppliers'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {user && (
            <>
              <TouchableOpacity
                style={[styles.addButton, styles.messageButton, { backgroundColor: theme.surface.info }]}
                onPress={() => router.push(`/suppliers-marketplace/conversation/${supplierId}` as any)}
              >
                <MessageSquare size={18} color={theme.accent.primary} />
                <Text style={[styles.addButtonText, { color: theme.text.primary }]}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, styles.messageButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => router.push('/suppliers-marketplace/my-messages' as any)}
              >
                <MessageSquare size={18} color={theme.accent.primary} />
                <Text style={[styles.addButtonText, { color: theme.text.primary }]}>Inbox</Text>
              </TouchableOpacity>
            </>
          )}
          {user && canRequestQuote && (
            <TouchableOpacity
              style={[styles.addButton, styles.messageButton, { backgroundColor: theme.surface.info }]}
              onPress={() => openRfqModal()}
            >
              <FileText size={18} color={theme.accent.primary} />
              <Text style={[styles.addButtonText, { color: theme.text.primary }]}>Request quote</Text>
            </TouchableOpacity>
          )}
          {user && (
            <>
              <TouchableOpacity
                style={[styles.addButton, styles.messageButton, { backgroundColor: isSaved ? theme.accent.primary + '20' : theme.surface.info }]}
                onPress={() => toggleSaved.mutate({ supplierProfileId: supplierId!, save: !isSaved })}
                disabled={toggleSaved.isPending}
              >
                <Bookmark size={18} color={theme.accent.primary} fill={isSaved ? theme.accent.primary : 'transparent'} />
                <Text style={[styles.addButtonText, { color: theme.text.primary }]}>{isSaved ? 'Unsave' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, styles.messageButton, { backgroundColor: isFollowed ? '#FECDD3' : theme.surface.info }]}
                onPress={() => {
                  const nextFollow = !isFollowed;
                  toggleFollow.mutate(
                    { supplierProfileId: supplierId!, follow: nextFollow },
                    { onSuccess: () => nextFollow && supplierId && recordSupplierEvent(supplierId, 'follow', { userId: user?.id }) }
                  );
                }}
                disabled={toggleFollow.isPending}
              >
                <Heart size={18} color="#BE123C" fill={isFollowed ? '#BE123C' : 'transparent'} />
                <Text style={[styles.addButtonText, { color: theme.text.primary }]}>{isFollowed ? 'Unfollow' : 'Follow'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {(profile.verificationTier && profile.verificationTier !== 'basic') || profile.verificationLevel > 0 || profile.verificationBadgeText ? (
          <View style={[styles.verificationRow, { backgroundColor: theme.background.card }]}>
            <ShieldCheck size={18} color={theme.accent.success} />
            <Text style={[styles.verificationText, { color: theme.text.secondary }]}>
              {profile.verificationTier && profile.verificationTier !== 'basic'
                ? profile.verificationTier.charAt(0).toUpperCase() + profile.verificationTier.slice(1)
                : profile.verificationBadgeText || (profile.verificationLevel > 0 ? `Verified level ${profile.verificationLevel}` : 'Verified')}
            </Text>
          </View>
        ) : null}
        {(profile.phone || profile.email || profile.whatsapp || profile.website) && (
          <View style={[styles.contactRow, { backgroundColor: theme.background.card }]}>
            {profile.phone && (
              <TouchableOpacity style={styles.contactChip} onPress={openPhone}>
                <Phone size={16} color={theme.accent.primary} />
                <Text style={[styles.contactChipText, { color: theme.accent.primary }]}>Call</Text>
              </TouchableOpacity>
            )}
            {profile.email && (
              <TouchableOpacity style={styles.contactChip} onPress={openEmail}>
                <Mail size={16} color={theme.accent.primary} />
                <Text style={[styles.contactChipText, { color: theme.accent.primary }]}>Email</Text>
              </TouchableOpacity>
            )}
            {profile.whatsapp && (
              <TouchableOpacity style={styles.contactChip} onPress={openWhatsApp}>
                <Text style={[styles.contactChipText, { color: theme.accent.primary }]}>WhatsApp</Text>
              </TouchableOpacity>
            )}
            {profile.website && (
              <TouchableOpacity style={styles.contactChip} onPress={openWebsite}>
                <Globe size={16} color={theme.accent.primary} />
                <Text style={[styles.contactChipText, { color: theme.accent.primary }]}>Website</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {user && (
          <TouchableOpacity style={[styles.reportLink, { backgroundColor: theme.background.card }]} onPress={openComplaintModal}>
            <AlertTriangle size={18} color={theme.accent.danger} />
            <Text style={[styles.reportLinkText, { color: theme.accent.danger }]}>Report a problem with this supplier</Text>
          </TouchableOpacity>
        )}
        {(profile.trustScore > 0 || profile.avgResponseHours != null || profile.firstSupplierReplyAt || followerCount > 0) && (
          <View style={styles.pillRow}>
            {followerCount > 0 && (
              <View style={[styles.pill, { backgroundColor: theme.surface.info }]}>
                <Text style={[styles.pillText, { color: theme.accent.primary }]}>{followerCount} follower{followerCount !== 1 ? 's' : ''}</Text>
              </View>
            )}
            {profile.trustScore > 0 && (
              <View style={[styles.pill, { backgroundColor: theme.surface.info }]}>
                <Text style={[styles.pillText, { color: theme.accent.info }]}>Trust: {profile.trustScore}%</Text>
              </View>
            )}
            {(profile.avgResponseHours != null || profile.firstSupplierReplyAt) && (
              <View style={[styles.pill, { backgroundColor: '#D1FAE5' }]}>
                <Clock size={14} color="#065F46" />
                <Text style={[styles.pillText, { color: '#065F46' }]}>
                  {profile.avgResponseHours != null
                    ? profile.avgResponseHours <= 24
                      ? 'Replies in <24h'
                      : `Replies in ~${Math.round(profile.avgResponseHours)}h`
                    : 'Responds to messages'}
                </Text>
              </View>
            )}
          </View>
        )}
        {profile.description && (
          <Text style={[styles.body, { color: theme.text.secondary }]}>{profile.description}</Text>
        )}
        <View style={[styles.reviewsSection, { backgroundColor: theme.background.card }]}>
          <View style={styles.reviewsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Reviews</Text>
            {reviews.length > 0 && (
              <Text style={[styles.avgRating, { color: theme.text.tertiary }]}>
                {(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)} ★ ({reviews.length})
              </Text>
            )}
            {user ? (
              <TouchableOpacity onPress={openReviewModal} style={[styles.writeReviewBtn, { backgroundColor: theme.accent.primary }]}>
                <MessageSquare size={16} color="#FFF" />
                <Text style={styles.writeReviewBtnText}>{myReview ? 'Edit your review' : 'Write a review'}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.mutedSmall, { color: theme.text.tertiary }]}>Sign in to leave a review</Text>
            )}
          </View>
          {reviews.length === 0 ? (
            <Text style={[styles.body, { color: theme.text.tertiary }]}>No reviews yet.</Text>
          ) : (
            reviews.slice(0, 10).map((r) => (
              <View key={r.id} style={[styles.reviewCard, { borderColor: theme.background.secondary }]}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={14} color={i <= r.rating ? '#F59E0B' : theme.text.tertiary} fill={i <= r.rating ? '#F59E0B' : 'transparent'} />
                    ))}
                  </View>
                  {user?.id === r.user_id && (
                    <View style={styles.reviewActions}>
                      <TouchableOpacity onPress={openReviewModal} style={styles.reviewActionBtn}>
                        <Pencil size={14} color={theme.accent.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteReview(r)} style={styles.reviewActionBtn}>
                        <Trash2 size={14} color={theme.accent.danger || '#DC2626'} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {r.title ? <Text style={[styles.reviewTitle, { color: theme.text.primary }]}>{r.title}</Text> : null}
                {r.body ? <Text style={[styles.reviewBody, { color: theme.text.secondary }]}>{r.body}</Text> : null}
                <Text style={[styles.mutedSmall, { color: theme.text.tertiary }]}>{new Date(r.created_at).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 16 }]}>
          Products{products.length > 0 ? ` (${filteredProducts.length})` : ''}
        </Text>

        {/* DreamBig store–style search bar */}
        <View style={[styles.productSearchContainer, { backgroundColor: theme.background.card }]}>
          <View style={[styles.productSearchIconWrap, { backgroundColor: theme.background.secondary }]}>
            <Search size={18} color={theme.text.secondary} />
          </View>
          <TextInput
            style={[styles.productSearchInput, { color: theme.text.primary }]}
            placeholder="Search products..."
            placeholderTextColor={theme.text.tertiary}
            value={productSearchQuery}
            onChangeText={setProductSearchQuery}
          />
        </View>

        {/* Filters row: categories + view + sort (matches DreamBig store toolbar) */}
        {products.length > 0 && (
          <View style={[styles.productToolbar, { backgroundColor: theme.background.primary }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productCategoryScroll} contentContainerStyle={styles.productCategoryContent}>
              <TouchableOpacity
                style={[styles.productCategoryChip, { backgroundColor: !selectedSubcategoryId ? theme.accent.primary : theme.background.secondary, borderColor: !selectedSubcategoryId ? theme.accent.primary : theme.border.light }]}
                onPress={() => setSelectedSubcategoryId(null)}
              >
                <Text style={[styles.productCategoryChipText, { color: !selectedSubcategoryId ? '#FFF' : theme.text.primary }]}>All</Text>
              </TouchableOpacity>
              {subcategories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.productCategoryChip, { backgroundColor: selectedSubcategoryId === c.id ? theme.accent.primary : theme.background.secondary, borderColor: selectedSubcategoryId === c.id ? theme.accent.primary : theme.border.light }]}
                  onPress={() => setSelectedSubcategoryId(selectedSubcategoryId === c.id ? null : c.id)}
                >
                  <Text style={[styles.productCategoryChipText, { color: selectedSubcategoryId === c.id ? '#FFF' : theme.text.primary }]} numberOfLines={1}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={[styles.productViewSortRow, { borderTopColor: theme.border.light }]}>
              <View style={styles.productViewModeGroup}>
                <TouchableOpacity
                  style={[styles.productViewModeBtn, productViewMode === 'grid' && { backgroundColor: theme.accent.primary + '22' }]}
                  onPress={() => setProductViewMode('grid')}
                >
                  <LayoutGrid size={20} color={productViewMode === 'grid' ? theme.accent.primary : theme.text.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.productViewModeBtn, productViewMode === 'list' && { backgroundColor: theme.accent.primary + '22' }]}
                  onPress={() => setProductViewMode('list')}
                >
                  <List size={20} color={productViewMode === 'list' ? theme.accent.primary : theme.text.tertiary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.productSortBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setShowSortMenu((v) => !v)}>
                <SlidersHorizontal size={18} color={theme.text.secondary} />
                <Text style={[styles.productSortBtnText, { color: theme.text.secondary }]}>{SORT_OPTIONS.find((o) => o.key === productSortBy)?.label ?? 'Sort'}</Text>
              </TouchableOpacity>
            </View>
            {showSortMenu && (
              <View style={[styles.productSortMenu, { backgroundColor: theme.background.card }]}>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.key} style={styles.productSortMenuItem} onPress={() => { setProductSortBy(opt.key); setShowSortMenu(false); }}>
                    <Text style={[styles.productSortMenuText, { color: productSortBy === opt.key ? theme.accent.primary : theme.text.primary }]}>{opt.label}</Text>
                    {productSortBy === opt.key && <Star size={14} color={theme.accent.primary} fill={theme.accent.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {products.length === 0 ? (
          <View style={[styles.productEmptyState, { backgroundColor: theme.background.card }]}>
            <View style={[styles.productEmptyIconWrap, { backgroundColor: theme.background.secondary }]}>
              <Package size={48} color={theme.text.tertiary} />
            </View>
            <Text style={[styles.productEmptyText, { color: theme.text.primary }]}>No products listed yet</Text>
            <Text style={[styles.productEmptySubtext, { color: theme.text.secondary }]}>Check back later or request a quote</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={[styles.productEmptyState, { backgroundColor: theme.background.card }]}>
            <View style={[styles.productEmptyIconWrap, { backgroundColor: theme.background.secondary }]}>
              <Package size={48} color={theme.text.tertiary} />
            </View>
            <Text style={[styles.productEmptyText, { color: theme.text.primary }]}>No products found</Text>
            <Text style={[styles.productEmptySubtext, { color: theme.text.secondary }]}>Try different search or filters</Text>
            <TouchableOpacity
              style={[styles.productClearBtn, { backgroundColor: theme.accent.primary }]}
              onPress={() => { setProductSearchQuery(''); setSelectedSubcategoryId(null); }}
            >
              <Text style={styles.productClearBtnText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        ) : productViewMode === 'grid' ? (
          <View style={styles.productsGrid}>
            {filteredProducts.map((p) => {
              const categoryName = p.subcategoryId ? subcategories.find((s) => s.id === p.subcategoryId)?.name : null;
              return (
                <View key={p.id} style={[styles.productCardGrid, { backgroundColor: theme.background.card }]}>
                  <TouchableOpacity onPress={() => router.push(`/suppliers-marketplace/product/${p.id}` as any)}>
                    <View style={styles.productCardImageWrap}>
                      <StorageImage uri={p.imageUrls?.[0]} bucket="product" style={styles.productCardImageGrid} resizeMode="cover" placeholderIcon="package" />
                      {(profile?.verificationTier && profile.verificationTier !== 'basic') || (profile?.verificationLevel ?? 0) > 0 ? (
                        <View style={styles.productBadgeOverlay}>
                          <VerificationBadge
                            verificationTier={profile?.verificationTier}
                            verificationLevel={profile?.verificationLevel}
                            verificationBadgeText={profile?.verificationBadgeText}
                            size="small"
                          />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.productCardContentGrid}>
                      {categoryName ? (
                        <View style={[styles.productCategoryBadge, { backgroundColor: theme.accent.primary + '18' }]}>
                          <Text style={[styles.productCategoryBadgeText, { color: theme.accent.primary }]} numberOfLines={1}>{categoryName}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.productName, { color: theme.text.primary }]} numberOfLines={2}>{p.name}</Text>
                      {p.price != null && (
                        <Text style={[styles.productPrice, { color: theme.accent.primary }]}>
                          {p.currency} {p.price.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  {user && canRequestQuote && (
                    <TouchableOpacity style={[styles.requestQuoteChipGrid, { backgroundColor: theme.surface.info }]} onPress={() => openRfqModal(p.id)}>
                      <FileText size={14} color={theme.accent.primary} />
                      <Text style={[styles.requestQuoteChipText, { color: theme.accent.primary }]}>Request quote</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          filteredProducts.map((p) => {
            const categoryName = p.subcategoryId ? subcategories.find((s) => s.id === p.subcategoryId)?.name : null;
            return (
              <View key={p.id} style={[styles.productCard, { backgroundColor: theme.background.card }]}>
                <TouchableOpacity style={styles.productCardMain} onPress={() => router.push(`/suppliers-marketplace/product/${p.id}` as any)}>
                  <View style={styles.productCardImageWrap}>
                    <StorageImage uri={p.imageUrls?.[0]} bucket="product" style={styles.productCardImage} resizeMode="cover" placeholderIcon="package" />
                    {(profile?.verificationTier && profile.verificationTier !== 'basic') || (profile?.verificationLevel ?? 0) > 0 ? (
                      <View style={styles.productBadgeOverlay}>
                        <VerificationBadge
                          verificationTier={profile?.verificationTier}
                          verificationLevel={profile?.verificationLevel}
                          verificationBadgeText={profile?.verificationBadgeText}
                          size="small"
                        />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.productCardInfo}>
                    {categoryName ? (
                      <View style={[styles.productCategoryBadge, { backgroundColor: theme.accent.primary + '18' }]}>
                        <Text style={[styles.productCategoryBadgeText, { color: theme.accent.primary }]} numberOfLines={1}>{categoryName}</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.productName, { color: theme.text.primary }]} numberOfLines={2}>{p.name}</Text>
                    {p.price != null && (
                      <Text style={[styles.productPrice, { color: theme.accent.primary }]}>
                        {p.currency} {p.price.toLocaleString()}
                      </Text>
                    )}
                    <ExternalLink size={16} color={theme.text.tertiary} style={styles.productArrow} />
                  </View>
                </TouchableOpacity>
                {user && canRequestQuote && (
                  <View style={[styles.requestQuoteRow, { borderTopColor: theme.border?.light || 'rgba(0,0,0,0.08)' }]}>
                    <TouchableOpacity style={[styles.requestQuoteChip, { backgroundColor: theme.surface.info }]} onPress={() => openRfqModal(p.id)}>
                      <FileText size={14} color={theme.accent.primary} />
                      <Text style={[styles.requestQuoteChipText, { color: theme.accent.primary }]}>Request quote</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setReviewModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.background.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{myReview ? 'Edit your review' : 'Write a review'}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} onPress={() => setReviewRating(i)}>
                  <Star size={32} color={i <= reviewRating ? '#F59E0B' : theme.text.tertiary} fill={i <= reviewRating ? '#F59E0B' : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Title (optional)" placeholderTextColor={theme.text.tertiary} value={reviewTitle} onChangeText={setReviewTitle} />
            <TextInput style={[styles.modalInput, styles.modalInputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Your review" placeholderTextColor={theme.text.tertiary} value={reviewBody} onChangeText={setReviewBody} multiline numberOfLines={3} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setReviewModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.accent.primary }]} onPress={submitReview} disabled={submittingReview}>
                {submittingReview ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={complaintModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setComplaintModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, styles.complaintModalContent, { backgroundColor: theme.background.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Report a problem</Text>
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Subject *</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Brief subject" placeholderTextColor={theme.text.tertiary} value={complaintSubject} onChangeText={setComplaintSubject} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Description *</Text>
            <TextInput style={[styles.modalInput, styles.modalInputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Describe the issue in detail" placeholderTextColor={theme.text.tertiary} value={complaintDescription} onChangeText={setComplaintDescription} multiline numberOfLines={4} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Order reference (optional)</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Order or transaction ref" placeholderTextColor={theme.text.tertiary} value={complaintOrderRef} onChangeText={setComplaintOrderRef} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Evidence (screenshots, photos)</Text>
            <ScrollView horizontal style={styles.evidenceRow} contentContainerStyle={styles.evidenceRowContent}>
              {complaintEvidenceUrls.map((url) => (
                <View key={url} style={styles.evidenceThumbWrap}>
                  <Image source={{ uri: url }} style={styles.evidenceThumb} />
                  <TouchableOpacity style={styles.evidenceRemove} onPress={() => setComplaintEvidenceUrls((p) => p.filter((u) => u !== url))}>
                    <X size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[styles.evidenceAdd, { borderColor: theme.text.tertiary }]} onPress={pickComplaintEvidence} disabled={uploadingEvidence}>
                {uploadingEvidence ? <ActivityIndicator size="small" color={theme.accent.primary} /> : <><Upload size={24} color={theme.accent.primary} /><Text style={[styles.evidenceAddText, { color: theme.text.tertiary }]}>Add</Text></>}
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setComplaintModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.accent.danger }]} onPress={submitComplaint} disabled={submittingComplaint}>
                {submittingComplaint ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={rfqModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setRfqModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, styles.complaintModalContent, { backgroundColor: theme.background.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Request a quote</Text>
            {products.length > 0 && (
              <>
                <Text style={[styles.label, { color: theme.text.tertiary }]}>Product (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rfqProductScroll} contentContainerStyle={styles.rfqProductScrollContent}>
                  <TouchableOpacity
                    style={[styles.rfqProductChip, !rfqProductId && { backgroundColor: theme.accent.primary }]}
                    onPress={() => setRfqProductId(null)}
                  >
                    <Text style={[styles.rfqProductChipText, { color: !rfqProductId ? '#FFF' : theme.text.secondary }]}>No specific product</Text>
                  </TouchableOpacity>
                  {products.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.rfqProductChip, rfqProductId === p.id && { backgroundColor: theme.accent.primary }]}
                      onPress={() => setRfqProductId(p.id)}
                    >
                      <Text style={[styles.rfqProductChipText, { color: rfqProductId === p.id ? '#FFF' : theme.text.secondary }]} numberOfLines={1}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Quantity *</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="e.g. 100" placeholderTextColor={theme.text.tertiary} value={rfqQuantity} onChangeText={setRfqQuantity} keyboardType="decimal-pad" />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Unit (optional)</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="e.g. kg, pieces, boxes" placeholderTextColor={theme.text.tertiary} value={rfqUnit} onChangeText={setRfqUnit} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Delivery location (optional)</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="City or address" placeholderTextColor={theme.text.tertiary} value={rfqDeliveryLocation} onChangeText={setRfqDeliveryLocation} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Needed by date (optional)</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="YYYY-MM-DD" placeholderTextColor={theme.text.tertiary} value={rfqNeededByDate} onChangeText={setRfqNeededByDate} />
            <Text style={[styles.label, { color: theme.text.tertiary }]}>Notes (optional)</Text>
            <TextInput style={[styles.modalInput, styles.modalInputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]} placeholder="Specifications, packaging, etc." placeholderTextColor={theme.text.tertiary} value={rfqNotes} onChangeText={setRfqNotes} multiline numberOfLines={3} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.background.secondary }]} onPress={() => setRfqModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.accent.primary }]} onPress={submitRfq} disabled={createRfq.isPending}>
                {createRfq.isPending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Send request</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroWrap: { height: 200, width: '100%', backgroundColor: '#0C4A6E' },
  heroCover: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroGradient: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroContent: { flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 20 },
  heroBack: { position: 'absolute', top: 12, left: 16, zIndex: 2, padding: 6, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  heroShare: { position: 'absolute', top: 12, right: 16, zIndex: 2, padding: 6, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroLogoWrap: { width: 64, height: 64, borderRadius: 14, borderWidth: 2, borderColor: '#FFF', overflow: 'hidden' },
  heroLogo: { width: 60, height: 60, borderRadius: 12 },
  heroText: { flex: 1, marginLeft: 14, marginBottom: 2 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, borderRadius: 14, marginBottom: 12 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  messageButton: { marginLeft: 0 },
  addButtonText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  verificationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginBottom: 12 },
  verificationText: { fontSize: 14 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, borderRadius: 14, marginBottom: 12 },
  contactChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactChipText: { fontSize: 14, fontWeight: '500' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pillText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22 },
  productSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productSearchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productSearchInput: { flex: 1, fontSize: 16, fontWeight: '500' },
  productToolbar: {
    marginBottom: 12,
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  productCategoryScroll: { marginBottom: 0 },
  productCategoryContent: { paddingRight: 12, gap: 10 },
  productCategoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    marginRight: 8,
  },
  productCategoryChipText: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  productViewSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  productViewModeGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productViewModeBtn: { padding: 10, borderRadius: 12 },
  productSortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  productSortBtnText: { fontSize: 13, fontWeight: '600' },
  productSortMenu: {
    marginTop: 8,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productSortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  productSortMenuText: { fontSize: 15, fontWeight: '600' },
  productEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginBottom: 12,
  },
  productEmptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  productEmptyText: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  productEmptySubtext: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  productClearBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  productClearBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  productCardGrid: {
    width: '47.5%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  productCardImageWrap: { position: 'relative' },
  productBadgeOverlay: { position: 'absolute', top: 8, left: 8, zIndex: 2 },
  productCardImageGrid: { width: '100%', height: 130, borderRadius: 12 },
  productCardContentGrid: { padding: 12, paddingTop: 10 },
  productCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  productCategoryBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  requestQuoteChipGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  productCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productCardMain: { flexDirection: 'row', alignItems: 'flex-start' },
  productCardImage: { width: 96, height: 96, borderRadius: 12 },
  productCardInfo: { flex: 1, marginLeft: 14, paddingVertical: 12, paddingRight: 12, paddingLeft: 0, minHeight: 96 },
  productName: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  productPrice: { fontSize: 15, marginTop: 6, fontWeight: '600' },
  productArrow: { position: 'absolute', right: 0, top: 12 },
  requestQuoteRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    marginTop: 4,
    borderTopWidth: 1,
  },
  requestQuoteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  requestQuoteChipText: { fontSize: 14, fontWeight: '600' },
  reviewsSection: { padding: 16, borderRadius: 12, marginBottom: 12 },
  reviewsSectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 },
  avgRating: { fontSize: 14 },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  writeReviewBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  mutedSmall: { fontSize: 12, marginTop: 4 },
  reviewCard: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewActions: { flexDirection: 'row', gap: 8 },
  reviewActionBtn: { padding: 6 },
  reviewTitle: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  reviewBody: { fontSize: 14, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modalInput: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 10 },
  modalInputArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 15 },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 12 },
  reportLinkText: { fontSize: 14, fontWeight: '500' },
  label: { fontSize: 12, marginBottom: 4, marginTop: 10 },
  complaintModalContent: { maxHeight: '85%' },
  evidenceRow: { marginTop: 8 },
  evidenceRowContent: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  evidenceThumbWrap: { position: 'relative' },
  evidenceThumb: { width: 64, height: 64, borderRadius: 8 },
  evidenceRemove: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 2 },
  evidenceAdd: { width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  evidenceAddText: { fontSize: 11, marginTop: 2 },
  rfqProductScroll: { marginBottom: 12 },
  rfqProductScrollContent: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  rfqProductChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  rfqProductChipText: { fontSize: 14, fontWeight: '500' },
});
