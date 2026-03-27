import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, GitCompare, Bookmark, Share2, ChevronRight, Star, MessageSquare, FileText, Pencil, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Share, Modal, TextInput, Alert as RNAlert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '@/components/PageHeader';
import { StorageImage } from '@/components/StorageImage';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { Package } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getProductShareUrl } from '@/lib/marketplace-sharing';
import { recordSupplierEvent } from '@/lib/supplier-analytics';
import { useAuth } from '@/contexts/AuthContext';
import { useRecordProductView, useSavedProducts, useToggleSavedProduct } from '@/hooks/useBuyerRetention';

export default function SupplierProductDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ productId: string | string[] }>();
  const productId = typeof params.productId === 'string' ? params.productId : params.productId?.[0];
  const { isFeatureVisible } = useFeatures();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const productViewRecorded = useRef(false);
  const recentViewRecorded = useRef(false);
  const canCompare = isFeatureVisible('supplier-compare') ?? true;
  const recordView = useRecordProductView(user?.id);
  const { data: savedProductIds = [] } = useSavedProducts(user?.id);
  const toggleSaved = useToggleSavedProduct(user?.id);
  const isSaved = productId ? savedProductIds.includes(productId) : false;
  const [reviews, setReviews] = useState<{ id: string; user_id: string; rating: number; title: string | null; body: string | null; created_at: string }[]>([]);
  const [myReview, setMyReview] = useState<{ id: string; rating: number; title: string | null; body: string | null; created_at: string } | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    productViewRecorded.current = false;
    recentViewRecorded.current = false;
  }, [productId]);

  useEffect(() => {
    if (product?.name) {
      if (typeof document !== 'undefined') document.title = `${product.name} | DreamBiz Marketplace`;
    }
  }, [product?.name]);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data, error } = await supabase
        .from('supplier_marketplace_products')
        .select('*, supplier_marketplace_profiles(id, business_name, verification_level, verification_badge_text, verification_tier)')
        .eq('id', productId)
        .eq('status', 'published')
        .single();
      if (!error && data) {
        setProduct(data);
        if (!productViewRecorded.current && data.supplier_profile_id) {
          productViewRecorded.current = true;
          recordSupplierEvent(data.supplier_profile_id, 'product_view', { productId: data.id, userId: user?.id });
        }
        if (user?.id && !recentViewRecorded.current) {
          recentViewRecorded.current = true;
          recordView.mutate(data.id);
        }
      }
      setLoading(false);
    };
    load();
  }, [productId, user?.id]);

  useEffect(() => {
    if (!productId) return;
    const loadReviews = async () => {
      const { data } = await supabase
        .from('supplier_product_reviews')
        .select('id, user_id, rating, title, body, created_at')
        .eq('product_id', productId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
      setReviews(data ?? []);
    };
    loadReviews();
  }, [productId]);

  useEffect(() => {
    if (!productId || !user?.id) {
      setMyReview(null);
      return;
    }
    const loadMyReview = async () => {
      const { data } = await supabase
        .from('supplier_product_reviews')
        .select('id, rating, title, body, created_at')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();
      setMyReview(data ? (data as any) : null);
    };
    loadMyReview();
  }, [productId, user?.id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }
  if (!product) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <Text style={{ color: theme.text.secondary }}>Product not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.accent.primary, marginTop: 12 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const firstImage = Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : null;
  const profile = product.supplier_marketplace_profiles;
  const imgWidth = Dimensions.get('window').width - 32;

  const handleShare = async () => {
    try {
      const shareUrl = getProductShareUrl(product.id);
      const title = product.name;
      const description = (product.short_description || product.description || '').substring(0, 150).trim();
      const message = [title, description, shareUrl].filter(Boolean).join('\n\n');
      await Share.share({
        title: `${title} | DreamBiz Marketplace`,
        message,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or share failed
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

  const submitReview = async () => {
    if (!productId || !user?.id) {
      RNAlert.alert('Sign in', 'You need to be signed in to leave a review.');
      return;
    }
    setSubmittingReview(true);
    try {
      if (myReview) {
        const { error } = await supabase
          .from('supplier_product_reviews')
          .update({
            rating: reviewRating,
            title: reviewTitle.trim() || null,
            body: reviewBody.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', myReview.id)
          .eq('user_id', user.id);
        if (error) throw error;
        const updated = { ...myReview, rating: reviewRating, title: reviewTitle.trim() || null, body: reviewBody.trim() || null };
        setMyReview(updated);
        setReviews((prev) => prev.map((r) => (r.id === myReview.id ? updated : r)));
        RNAlert.alert('Updated', 'Your review has been updated.');
      } else {
        const { data: inserted, error } = await supabase
          .from('supplier_product_reviews')
          .insert({
            product_id: productId,
            user_id: user.id,
            rating: reviewRating,
            title: reviewTitle.trim() || null,
            body: reviewBody.trim() || null,
          })
          .select('id, rating, title, body, created_at')
          .single();
        if (error) throw error;
        const newR = inserted as any;
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

  const avgRating = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  const handleDeleteReview = (r: { id: string; title: string | null }) => {
    RNAlert.alert('Delete review', 'Remove your review? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          try {
            const { error } = await supabase.from('supplier_product_reviews').delete().eq('id', r.id).eq('user_id', user.id);
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

  const canRequestQuote = isFeatureVisible('supplier-rfq') ?? true;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <PageHeader
        title={product.name}
        subtitle={profile?.business_name ?? 'Product'}
        icon={Package}
        iconGradient={['#F59E0B', '#D97706']}
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        }
        rightAction={
          <TouchableOpacity onPress={handleShare}>
            <Share2 size={22} color={theme.accent.primary} />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {Array.isArray(product.image_urls) && product.image_urls.length > 0 ? (
          <View style={styles.imageSection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageGallery}
              contentContainerStyle={styles.imageGalleryContent}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / imgWidth);
                setSelectedImageIndex(idx);
              }}
            >
              {product.image_urls.map((url: string, i: number) => (
                <View key={i} style={[styles.imageSlide, { width: imgWidth }]}>
                  <StorageImage uri={url} bucket="product" style={styles.image} resizeMode="cover" placeholderIcon="package" />
                </View>
              ))}
            </ScrollView>
            {product.image_urls.length > 1 && (
              <View style={styles.imageIndicators}>
                {product.image_urls.map((_, i) => (
                  <View key={i} style={[styles.indicator, { backgroundColor: selectedImageIndex === i ? theme.accent.primary : theme.text.tertiary + '50' }]} />
                ))}
              </View>
            )}
            {(profile?.verification_tier && profile.verification_tier !== 'basic') || (profile?.verification_level ?? 0) > 0 ? (
              <View style={styles.badgeOverlay}>
                <VerificationBadge
                  verificationTier={profile?.verification_tier}
                  verificationLevel={profile?.verification_level}
                  verificationBadgeText={profile?.verification_badge_text}
                  size="small"
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.imageSection}>
            <StorageImage uri={firstImage} bucket="product" style={styles.image} resizeMode="cover" placeholderIcon="package" />
            {(profile?.verification_tier && profile.verification_tier !== 'basic') || (profile?.verification_level ?? 0) > 0 ? (
              <View style={styles.badgeOverlay}>
                <VerificationBadge
                  verificationTier={profile?.verification_tier}
                  verificationLevel={profile?.verification_level}
                  verificationBadgeText={profile?.verification_badge_text}
                  size="small"
                />
              </View>
            ) : null}
          </View>
        )}
        <View style={[styles.infoCard, { backgroundColor: theme.background.card, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 8 } }) }]}>
        <TouchableOpacity
          style={[styles.supplierRow, { backgroundColor: 'transparent' }]}
          onPress={() => profile?.id && router.push(`/suppliers-marketplace/${profile.id}` as any)}
        >
          <Text style={[styles.supplierName, { color: theme.text.primary }]}>{profile?.business_name ?? 'Supplier'}</Text>
          {(profile?.verification_tier && profile.verification_tier !== 'basic') || (profile?.verification_level ?? 0) > 0 ? (
            <VerificationBadge
              verificationTier={profile?.verification_tier}
              verificationLevel={profile?.verification_level}
              verificationBadgeText={profile?.verification_badge_text}
              size="small"
            />
          ) : null}
          <ChevronRight size={18} color={theme.text.tertiary} />
        </TouchableOpacity>
        <View style={styles.priceRow}>
        {product.price != null && (
          <Text style={[styles.price, { color: theme.accent.primary }]}>
            {product.currency || 'USD'} {Number(product.price).toLocaleString()}
            {product.price_type === 'negotiable' && ' (negotiable)'}
          </Text>
        )}
        </View>
        <View style={styles.metaRow}>
          {product.sku && <Text style={[styles.metaText, { color: theme.text.tertiary }]}>SKU: {product.sku}</Text>}
          {product.unit_type && <Text style={[styles.metaText, { color: theme.text.tertiary }]}>Unit: {product.unit_type}</Text>}
          {product.min_order_qty != null && <Text style={[styles.metaText, { color: theme.text.tertiary }]}>MOQ: {product.min_order_qty}</Text>}
          {product.lead_time_days != null && <Text style={[styles.metaText, { color: theme.text.tertiary }]}>Lead time: {product.lead_time_days} days</Text>}
          {product.availability_status && <Text style={[styles.metaText, { color: theme.text.tertiary }]}>Availability: {String(product.availability_status).replace(/_/g, ' ')}</Text>}
        </View>
        {Array.isArray(product.tier_prices) && product.tier_prices.length > 0 && (
          <View style={[styles.tierSection, { backgroundColor: theme.background.secondary }]}>
            <Text style={[styles.tierTitle, { color: theme.text.primary }]}>Volume pricing</Text>
            {product.tier_prices.map((t: { min_qty?: number; price?: number }, i: number) => (
              <Text key={i} style={[styles.tierRow, { color: theme.text.secondary }]}>
                {t.min_qty}+ units: {product.currency || 'USD'} {Number(t.price ?? 0).toLocaleString()} each
              </Text>
            ))}
          </View>
        )}
        {Array.isArray(product.specifications) && product.specifications.length > 0 && (
          <View style={[styles.tierSection, { backgroundColor: theme.background.primary }]}>
            <Text style={[styles.tierTitle, { color: theme.text.primary }]}>Specifications</Text>
            {product.specifications.map((s: { key?: string; value?: string }, i: number) => (
              <View key={i} style={styles.specRow}>
                <Text style={[styles.specKey, { color: theme.text.tertiary }]}>{s.key}:</Text>
                <Text style={[styles.specValue, { color: theme.text.secondary }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}
        {product.short_description ? <Text style={[styles.body, { color: theme.text.secondary }]}>{product.short_description}</Text> : null}
        {product.description ? <Text style={[styles.body, { color: theme.text.secondary }]}>{product.description}</Text> : null}
        </View>

        <View style={[styles.reviewsSection, { backgroundColor: theme.background.primary }]}>
          <View style={styles.reviewsHeader}>
            <View style={styles.reviewsHeaderLeft}>
              <Star size={18} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.reviewsTitle, { color: theme.text.primary }]}>Reviews {reviews.length > 0 ? `(${reviews.length})` : ''}</Text>
              {reviews.length > 0 && (
                <Text style={[styles.avgRating, { color: theme.text.tertiary }]}>
                  {avgRating.toFixed(1)} avg
                </Text>
              )}
            </View>
            {user && (
              <TouchableOpacity style={[styles.writeReviewBtn, { backgroundColor: theme.surface.info }]} onPress={openReviewModal}>
                <MessageSquare size={16} color={theme.accent.primary} />
                <Text style={[styles.writeReviewBtnText, { color: theme.accent.primary }]}>{myReview ? 'Edit review' : 'Write review'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {reviews.length === 0 ? (
            <Text style={[styles.noReviews, { color: theme.text.tertiary }]}>
              {user ? 'No reviews yet. Be the first to review!' : 'No reviews yet.'}
            </Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={[styles.reviewCard, { borderColor: theme.border.light }]}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={14} color={i <= r.rating ? '#F59E0B' : (theme.text.tertiary ?? '#9CA3AF')} fill={i <= r.rating ? '#F59E0B' : 'transparent'} />
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
                <Text style={[styles.reviewDate, { color: theme.text.tertiary }]}>{new Date(r.created_at).toLocaleDateString()}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.actionRow}>
          {user && (
            <TouchableOpacity
              style={[styles.saveProductBtn, { backgroundColor: isSaved ? theme.accent.primary + '20' : theme.surface.info }]}
              onPress={() => toggleSaved.mutate({ productId: product.id, save: !isSaved })}
              disabled={toggleSaved.isPending}
            >
              <Bookmark size={18} color={theme.accent.primary} fill={isSaved ? theme.accent.primary : 'transparent'} />
              <Text style={[styles.compareBtnText, { color: theme.accent.primary }]}>{isSaved ? 'Saved' : 'Save product'}</Text>
            </TouchableOpacity>
          )}
          {user && canRequestQuote && profile?.id && (
            <TouchableOpacity
              style={[styles.requestQuoteBtn, { backgroundColor: theme.accent.primary }]}
              onPress={() => router.push(`/suppliers-marketplace/${profile.id}?openRfq=1&productId=${product.id}` as any)}
            >
              <FileText size={18} color="#FFF" />
              <Text style={[styles.compareBtnText, { color: '#FFF' }]}>Request quote</Text>
            </TouchableOpacity>
          )}
          {canCompare && (
            <TouchableOpacity
              style={[styles.compareBtn, { backgroundColor: theme.surface.info }]}
              onPress={() => router.push({ pathname: '/suppliers-marketplace/compare', params: { name: product.name } } as any)}
            >
              <GitCompare size={18} color={theme.accent.primary} />
              <Text style={[styles.compareBtnText, { color: theme.accent.primary }]}>Compare suppliers</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setReviewModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.background.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{myReview ? 'Edit your review' : 'Write a review'}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} onPress={() => setReviewRating(i)}>
                  <Star size={32} color={i <= reviewRating ? '#F59E0B' : (theme.text.tertiary ?? '#9CA3AF')} fill={i <= reviewRating ? '#F59E0B' : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Title (optional)"
              placeholderTextColor={theme.text.tertiary}
              value={reviewTitle}
              onChangeText={setReviewTitle}
            />
            <TextInput
              style={[styles.modalInput, styles.modalInputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Your review"
              placeholderTextColor={theme.text.tertiary}
              value={reviewBody}
              onChangeText={setReviewBody}
              multiline
              numberOfLines={3}
            />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, paddingTop: 0 },
  imageSection: { position: 'relative', marginBottom: 0 },
  imageGallery: {},
  imageGalleryContent: {},
  imageSlide: { paddingRight: 0 },
  image: { width: '100%', height: 280, borderRadius: 0 },
  imageIndicators: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  indicator: { width: 8, height: 8, borderRadius: 4 },
  badgeOverlay: { position: 'absolute', top: 12, left: 16, zIndex: 2 },
  infoCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, paddingTop: 24, paddingHorizontal: 16, paddingBottom: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  supplierName: { flex: 1, fontSize: 15, fontWeight: '600' },
  tierSection: { marginBottom: 12, padding: 12, borderRadius: 10 },
  tierTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  tierRow: { fontSize: 14, marginBottom: 4 },
  specRow: { flexDirection: 'row', marginBottom: 6 },
  specKey: { fontSize: 14, fontWeight: '500', minWidth: 90 },
  specValue: { fontSize: 14, flex: 1 },
  price: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  metaText: { fontSize: 13 },
  body: { fontSize: 15, lineHeight: 22 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  saveProductBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  compareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  compareBtnText: { fontWeight: '600', fontSize: 15 },
  reviewsSection: { marginTop: 20, padding: 16, borderRadius: 12 },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  reviewsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewsTitle: { fontSize: 16, fontWeight: '600' },
  avgRating: { fontSize: 13 },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  writeReviewBtnText: { fontSize: 14, fontWeight: '600' },
  noReviews: { fontSize: 14, fontStyle: 'italic' },
  reviewCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewActions: { flexDirection: 'row', gap: 8 },
  reviewActionBtn: { padding: 6 },
  requestQuoteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  reviewTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  reviewBody: { fontSize: 14, marginBottom: 4 },
  reviewDate: { fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modalInput: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 12 },
  modalInputArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontWeight: '600', fontSize: 16 },
});
