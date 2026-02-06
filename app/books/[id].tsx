import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import * as Linking from 'expo-linking';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ShoppingCart, Star, BookOpen, Check, X, CreditCard, Smartphone, Building2, DollarSign, Upload, Loader } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBookBySlug } from '@/lib/book-service';
import type { Book } from '@/types/books';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';
import { useAds } from '@/contexts/AdContext';
import type { AdPackage } from '@/types/super-admin';

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'crypto' | 'other';
  is_active: boolean;
  requires_setup: boolean;
  setup_instructions?: string;
  display_order: number;
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { business } = useBusiness();
  const { consumeLastAdClick, trackConversion } = useAds();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [adHeadline, setAdHeadline] = useState('');
  const [adBodyText, setAdBodyText] = useState('');
  const [adCtaText, setAdCtaText] = useState('Read Now');
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [adBudget, setAdBudget] = useState('');
  const [adCurrency, setAdCurrency] = useState('USD');
  const [adPaymentReference, setAdPaymentReference] = useState('');
  const [adPaymentProofUrl, setAdPaymentProofUrl] = useState<string | null>(null); // Only public URLs, never file://
  const [adPaymentProofPreview, setAdPaymentProofPreview] = useState<string | null>(null); // Local file URI for preview only
  const [isUploadingAdProof, setIsUploadingAdProof] = useState(false);
  const [adPackages, setAdPackages] = useState<AdPackage[]>([]);
  const [selectedAdPackageId, setSelectedAdPackageId] = useState<string | null>(null);
  const [adLocations, setAdLocations] = useState<string[]>(['books', 'dashboard']);
  const [autoRenew, setAutoRenew] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'none' | 'pending' | 'completed' | 'failed'>('none');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  const loadBook = useCallback(async () => {
    try {
      setIsLoading(true);
      // Try to get by ID first, then by slug
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Try by slug
        const bookBySlug = await getBookBySlug(id);
        if (bookBySlug) {
          setBook(bookBySlug);
        }
      } else if (data) {
        setBook({
          id: data.id,
          slug: data.slug,
          title: data.title,
          subtitle: data.subtitle,
          description: data.description,
          coverImage: data.cover_image,
          documentFileUrl: data.document_file_url,
          price: parseFloat(data.price || '0'),
          currency: data.currency || 'USD',
          salePrice: data.sale_price ? parseFloat(data.sale_price) : undefined,
          saleStartDate: data.sale_start_date,
          saleEndDate: data.sale_end_date,
          totalChapters: data.total_chapters || 0,
          chapters: Array.isArray(data.chapters) ? data.chapters : (typeof data.chapters === 'string' ? JSON.parse(data.chapters) : []),
          author: data.author,
          isbn: data.isbn,
          publicationDate: data.publication_date,
          pageCount: data.page_count,
          status: data.status,
          isFeatured: data.is_featured || false,
          displayOrder: data.display_order || 0,
          totalSales: data.total_sales || 0,
          totalRevenue: parseFloat(data.total_revenue || '0'),
          createdBy: data.created_by,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (error) {
      console.error('Failed to load book:', error);
      Alert.alert('Error', 'Failed to load book details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setPaymentMethods(data);
        setSelectedPaymentMethod(data[0]);
        setPaymentMethod(data[0].name);
      } else {
        setPaymentMethods([]);
        setSelectedPaymentMethod(null);
        setPaymentMethod('');
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      setPaymentMethods([]);
      setSelectedPaymentMethod(null);
      setPaymentMethod('');
    }
  }, []);

  const checkPurchaseStatus = useCallback(async () => {
    if (!user || !id) return;

    try {
      const { data } = await supabase
        .from('book_purchases')
        .select('*')
        .eq('book_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        if (data.payment_status === 'completed' && data.access_granted) {
          setHasPurchased(true);
          setPurchaseStatus('completed');
        } else if (data.payment_status === 'pending') {
          setPurchaseStatus('pending');
        } else if (data.payment_status === 'failed' || data.payment_status === 'refunded') {
          setPurchaseStatus('failed');
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Purchase status check failed:', error);
      }
      // User hasn't purchased this book
      setHasPurchased(false);
      setPurchaseStatus('none');
    }
  }, [id, user]);

  useEffect(() => {
    loadBook();
    checkPurchaseStatus();
    loadPaymentMethods();
  }, [checkPurchaseStatus, loadBook, loadPaymentMethods]);

  useEffect(() => {
    const loadPackages = async () => {
      const { data, error } = await supabase
        .from('ad_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (!error && data) {
        setAdPackages(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          price: parseFloat(row.price),
          currency: row.currency,
          pricePerLocation: row.price_per_location ? parseFloat(row.price_per_location) : 1,
          durationDays: row.duration_days,
          isActive: row.is_active,
          displayOrder: row.display_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    };
    loadPackages();
  }, []);

  const getCurrentPrice = () => {
    if (!book) return 0;
    const now = new Date();
    if (book.salePrice && book.saleStartDate && book.saleEndDate) {
      const saleStart = new Date(book.saleStartDate);
      const saleEnd = new Date(book.saleEndDate);
      if (now >= saleStart && now <= saleEnd) {
        return book.salePrice;
      }
    }
    return book.price;
  };

  const handlePurchase = async () => {
    if (!book || !user || !business) {
      Alert.alert('Error', 'Please sign in to purchase books');
      return;
    }

    if (hasPurchased) {
      Alert.alert('Already Purchased', 'You already own this book. Check your library.');
      return;
    }

    setShowPurchaseModal(true);
  };

  const handleOpenPromoteModal = () => {
    if (!book) return;
    setAdHeadline(book.title);
    setAdBodyText(book.description || '');
    setAdCtaText('Read Now');
    setAdBudget('');
    setAdCurrency(book.currency || 'USD');
    setAdPaymentReference('');
    setAdPaymentProofUrl(null);
    setAdPaymentProofPreview(null);
    setSelectedAdPackageId(null);
    setAdLocations(['books', 'dashboard']);
    setAutoRenew(false);
    setShowPromoteModal(true);
  };

  const applyPackagePricing = (pkg: AdPackage, locations: string[]) => {
    const count = Math.max(1, locations.length);
    const total = pkg.price * (pkg.pricePerLocation || 1) * count;
    setAdBudget(total.toFixed(2));
    setAdCurrency(pkg.currency);
  };

  const handlePickAdProofImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll access to upload proof of payment');
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
      // Set local URI for preview only (never in adPaymentProofUrl state)
      setAdPaymentProofPreview(asset.uri);
      setIsUploadingAdProof(true);
      try {
          const base64 = await getBase64FromAsset(asset);
          const fileName = buildAssetFileName(asset, 'ad-payment-proof');
          // Don't include bucket name in filePath - it's already specified in bucket parameter
          const filePath = fileName;
          
          const publicUrl = await uploadBase64ToStorage(supabase, {
            bucket: 'ad_payment_proofs',
            filePath,
            base64,
            contentType: asset.mimeType || 'image/jpeg',
            upsert: false,
          });
          
          // Only set public URL (never file:// URIs)
          if (publicUrl && !publicUrl.startsWith('file://')) {
            setAdPaymentProofUrl(publicUrl);
            setAdPaymentProofPreview(null); // Clear preview once we have public URL
            console.log('[Ad Proof Upload] Success:', { publicUrl, fileName });
          } else {
            throw new Error('Upload succeeded but no valid public URL returned');
          }
        } catch (error: any) {
          console.error('[Ad Proof Upload] Upload failed:', {
            error: error.message || String(error),
            fileName,
            filePath,
          });
          // Clear both preview and URL on error
          setAdPaymentProofUrl(null);
          setAdPaymentProofPreview(null);
          Alert.alert('Upload Error', error.message || 'Failed to upload proof');
        } finally {
          setIsUploadingAdProof(false);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleSubmitBookAd = async () => {
    if (!user || !book) return;
    if (!adHeadline.trim()) {
      Alert.alert('Missing Fields', 'Please add a headline for your ad.');
      return;
    }
    if (!adBudget || !adPaymentProofUrl) {
      Alert.alert('Missing Fields', 'Please enter a budget and upload proof of payment.');
      return;
    }
    try {
      setIsSubmittingAd(true);
      const { error } = await supabase.from('advertisements').insert({
        title: book.title,
        description: adBodyText.trim() || null,
        type: 'card',
        image_url: book.coverImage || null,
        headline: adHeadline.trim(),
        body_text: adBodyText.trim() || null,
        cta_text: adCtaText.trim() || 'Read Now',
        cta_action: 'open_book',
        cta_target_id: book.id,
        status: 'pending',
        payment_status: 'pending',
        payment_amount: parseFloat(adBudget),
        payment_currency: adCurrency,
        payment_reference: adPaymentReference || null,
        payment_proof_url: adPaymentProofUrl,
        ad_package_id: selectedAdPackageId,
        auto_renew: autoRenew,
        targeting: { scope: 'global' },
        placement: { locations: adLocations, priority: 1, frequency: 'once_per_day' },
        created_by: user.id,
      });
      if (error) throw error;
      Alert.alert('Submitted', 'Your ad request has been sent for admin approval.');
      setShowPromoteModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit ad request.');
    } finally {
      setIsSubmittingAd(false);
    }
  };

  const handlePickProofImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll access to upload proof of payment');
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
          const fileName = buildAssetFileName(asset, 'book-payment-proof');
          const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          // filePath should NOT include the bucket name - it's already specified in the bucket parameter
          const filePath = fileName;

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
            bucket: 'payment_proofs',
            filePath,
            base64,
            contentType,
            upsert: false,
          });

          setProofImage(publicUrl);
        } catch (error: any) {
          console.error('Error uploading proof:', error);
          Alert.alert('Upload Error', error.message || 'Failed to upload proof of payment');
        } finally {
          setIsUploadingProof(false);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleConfirmPurchase = async () => {
    if (!book || !user || !business) return;

    if (!paymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method to continue');
      return;
    }

    if (!proofImage) {
      Alert.alert('Proof Required', 'Please upload proof of payment to complete your purchase');
      return;
    }

    try {
      setIsPurchasing(true);
      const price = getCurrentPrice();
      const attribution = consumeLastAdClick();

      // Create purchase record with pending status
      const { error } = await supabase
        .from('book_purchases')
        .insert({
          book_id: book.id,
          user_id: user.id,
          business_id: business.id,
          unit_price: price,
          total_price: price,
          currency: book.currency,
          payment_method: paymentMethod,
          payment_status: 'pending', // Start as pending, requires admin verification
          payment_reference: paymentReference || null,
          payment_notes: paymentNotes || null,
          proof_of_payment_url: proofImage,
          access_granted: false, // Access granted only after admin approval
          ...(attribution ? { ad_id: attribution.adId } : {}),
        })
        .select()
        .single();

      if (error) throw error;

      if (attribution) {
        await trackConversion(attribution.adId, attribution.location, price);
      }

      setPurchaseStatus('pending');
      setShowPurchaseModal(false);
      setProofImage(null);
      setPaymentReference('');
      setPaymentNotes('');
      
      Alert.alert(
        'Payment Submitted',
        'Your payment has been submitted for verification. You will receive access to the book once your payment is approved by our team.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Failed to submit payment:', error);
      Alert.alert('Error', error.message || 'Failed to submit payment');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleReadBook = () => {
    if (book?.documentFileUrl) {
      // Open book document
      Linking.openURL(book.documentFileUrl);
    } else {
      Alert.alert('Not Available', 'Book document is not available yet.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading book...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <BookOpen size={64} color={theme.text.tertiary} />
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>Book not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPrice = getCurrentPrice();
  const isOnSale = book.salePrice && currentPrice < book.price;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: book.title, headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
          {book.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Cover Image */}
        <View style={[styles.coverSection, { backgroundColor: theme.background.card }]}>
          {book.coverImage ? (
            <Image source={{ uri: book.coverImage }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: theme.background.secondary }]}>
              <BookOpen size={64} color={theme.text.tertiary} />
            </View>
          )}
        </View>

        {/* Book Info */}
        <View style={[styles.infoSection, { backgroundColor: theme.background.card }]}>
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text style={[styles.title, { color: theme.text.primary }]}>{book.title}</Text>
              {book.subtitle && (
                <Text style={[styles.subtitle, { color: theme.text.secondary }]}>{book.subtitle}</Text>
              )}
            </View>
            {book.isFeatured && (
              <View style={[styles.featuredBadge, { backgroundColor: theme.accent.primary + '20' }]}>
                <Star size={16} color={theme.accent.primary} fill={theme.accent.primary} />
              </View>
            )}
          </View>

          {book.description && (
            <Text style={[styles.description, { color: theme.text.secondary }]}>
              {book.description}
            </Text>
          )}

          {/* Book Details */}
          <View style={styles.detailsGrid}>
            {book.author && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Author</Text>
                <Text style={[styles.detailValue, { color: theme.text.primary }]}>{book.author}</Text>
              </View>
            )}
            {book.totalChapters > 0 && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Chapters</Text>
                <Text style={[styles.detailValue, { color: theme.text.primary }]}>{book.totalChapters}</Text>
              </View>
            )}
            {book.pageCount && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Pages</Text>
                <Text style={[styles.detailValue, { color: theme.text.primary }]}>{book.pageCount}</Text>
              </View>
            )}
            {book.isbn && (
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>ISBN</Text>
                <Text style={[styles.detailValue, { color: theme.text.primary }]}>{book.isbn}</Text>
              </View>
            )}
          </View>

          {/* Chapters List */}
          {book.chapters && book.chapters.length > 0 && (
            <View style={styles.chaptersSection}>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Chapters</Text>
              {book.chapters.map((chapter, index) => (
                <View key={index} style={[styles.chapterItem, { backgroundColor: theme.background.secondary }]}>
                  <Text style={[styles.chapterNumber, { color: theme.accent.primary }]}>
                    Chapter {chapter.number}
                  </Text>
                  <Text style={[styles.chapterTitle, { color: theme.text.primary }]}>
                    {chapter.title}
                  </Text>
                  {chapter.description && (
                    <Text style={[styles.chapterDescription, { color: theme.text.secondary }]}>
                      {chapter.description}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Price */}
          <View style={styles.priceSection}>
            {isOnSale && (
              <Text style={[styles.originalPrice, { color: theme.text.tertiary }]}>
                {book.currency} {book.price.toFixed(2)}
              </Text>
            )}
            <Text style={[styles.price, { color: theme.accent.primary }]}>
              {book.currency} {currentPrice.toFixed(2)}
            </Text>
            {isOnSale && (
              <View style={[styles.saleBadge, { backgroundColor: '#EF444420' }]}>
                <Text style={[styles.saleText, { color: '#EF4444' }]}>ON SALE</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <View style={[styles.footer, { backgroundColor: theme.background.card, borderTopColor: theme.border.light }]}>
        {user && (
          <TouchableOpacity
            style={[styles.promoteButton, { borderColor: theme.accent.primary }]}
            onPress={handleOpenPromoteModal}
          >
            <Text style={[styles.promoteButtonText, { color: theme.accent.primary }]}>Promote This Book</Text>
          </TouchableOpacity>
        )}
        {hasPurchased ? (
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: theme.accent.primary }]}
            onPress={handleReadBook}
          >
            <BookOpen size={20} color="#FFF" />
            <Text style={styles.purchaseButtonText}>Read Book</Text>
          </TouchableOpacity>
        ) : purchaseStatus === 'pending' ? (
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: '#F59E0B' }]}
            disabled
          >
            <Loader size={20} color="#FFF" />
            <Text style={styles.purchaseButtonText}>Payment Pending Verification</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.purchaseButton, { backgroundColor: theme.accent.primary }]}
            onPress={handlePurchase}
          >
            <ShoppingCart size={20} color="#FFF" />
            <Text style={styles.purchaseButtonText}>
              Buy Now - {book.currency} {currentPrice.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showPromoteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPromoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Promote Book</Text>
              <TouchableOpacity onPress={() => setShowPromoteModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Headline *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Ad headline"
                placeholderTextColor={theme.text.tertiary}
                value={adHeadline}
                onChangeText={setAdHeadline}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Body Text</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Describe your book..."
                placeholderTextColor={theme.text.tertiary}
                value={adBodyText}
                onChangeText={setAdBodyText}
                multiline
                numberOfLines={4}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>CTA Text</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Read Now"
                placeholderTextColor={theme.text.tertiary}
                value={adCtaText}
                onChangeText={setAdCtaText}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Ad Package</Text>
              <View style={styles.packageGrid}>
                {adPackages.map(pkg => {
                  const isSelected = selectedAdPackageId === pkg.id;
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[
                        styles.packageCard,
                        {
                          backgroundColor: isSelected ? theme.accent.primary + '12' : theme.background.secondary,
                          borderColor: isSelected ? theme.accent.primary : theme.border.light,
                        },
                      ]}
                      onPress={() => {
                        setSelectedAdPackageId(pkg.id);
                        applyPackagePricing(pkg, adLocations);
                      }}
                    >
                      <Text style={[styles.packageName, { color: theme.text.primary }]}>{pkg.name}</Text>
                      <Text style={[styles.packageMeta, { color: theme.text.secondary }]}>
                        {pkg.currency} {pkg.price.toFixed(2)} · {pkg.durationDays} days
                      </Text>
                      {pkg.description && (
                        <Text style={[styles.packageMeta, { color: theme.text.tertiary }]}>{pkg.description}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Ad Locations</Text>
              <View style={styles.packageGrid}>
                {['dashboard', 'products', 'customers', 'finances', 'documents', 'insights'].map(loc => {
                  const isSelected = adLocations.includes(loc);
                  return (
                    <TouchableOpacity
                      key={loc}
                      style={[
                        styles.packageCard,
                        {
                          backgroundColor: isSelected ? theme.accent.primary + '12' : theme.background.secondary,
                          borderColor: isSelected ? theme.accent.primary : theme.border.light,
                        },
                      ]}
                      onPress={() => {
                        const next = isSelected
                          ? adLocations.filter(item => item !== loc)
                          : [...adLocations, loc];
                        setAdLocations(next);
                        const pkg = adPackages.find(p => p.id === selectedAdPackageId);
                        if (pkg) {
                          applyPackagePricing(pkg, next);
                        }
                      }}
                    >
                      <Text style={[styles.packageName, { color: theme.text.primary }]}>{loc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Ad Budget</Text>
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, styles.rowInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  value={adBudget}
                  onChangeText={setAdBudget}
                  keyboardType="decimal-pad"
                  editable={!selectedAdPackageId}
                />
                <TextInput
                  style={[styles.input, styles.rowInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="USD"
                  placeholderTextColor={theme.text.tertiary}
                  value={adCurrency}
                  onChangeText={(text) => setAdCurrency(text.toUpperCase().slice(0, 3))}
                  editable={!selectedAdPackageId}
                />
              </View>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Payment Reference (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Reference"
                placeholderTextColor={theme.text.tertiary}
                value={adPaymentReference}
                onChangeText={setAdPaymentReference}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Proof of Payment *</Text>
              {(adPaymentProofUrl || adPaymentProofPreview) ? (
                <View>
                  {/* Show loading indicator if we only have preview (local file) or during upload */}
                  {adPaymentProofPreview && !adPaymentProofUrl ? (
                    <View style={[styles.proofImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background.secondary }]}>
                      <ActivityIndicator size="large" color={theme.accent.primary} />
                      <Text style={[styles.proofUploadText, { color: theme.text.primary, marginTop: 8 }]}>
                        {isUploadingAdProof ? 'Uploading...' : 'Processing...'}
                      </Text>
                    </View>
                  ) : adPaymentProofUrl && !adPaymentProofUrl.startsWith('file://') ? (
                    // Only render Image with public URL (never file://)
                    <Image 
                      key={adPaymentProofUrl} // Force re-render when URL changes
                      source={{ uri: adPaymentProofUrl }} 
                      style={styles.proofImage}
                      resizeMode="cover"
                      onError={(e) => {
                        const errorDetails = {
                          url: adPaymentProofUrl,
                          error: e.nativeEvent?.error || 'Unknown error',
                          errorCode: e.nativeEvent?.errorCode,
                          errorMessage: e.nativeEvent?.errorMessage,
                        };
                        console.error('[Ad Proof] Image load error:', JSON.stringify(errorDetails, null, 2));
                        // Clear invalid URL
                        setAdPaymentProofUrl(null);
                      }}
                      onLoad={() => {
                        console.log('[Ad Proof] Image loaded successfully:', adPaymentProofUrl);
                      }}
                    />
                  ) : null}
                  <TouchableOpacity
                    style={[styles.proofUploadButton, { marginTop: 8, borderColor: theme.border.light }]}
                    onPress={handlePickAdProofImage}
                    disabled={isUploadingAdProof}
                  >
                    <Text style={[styles.proofUploadText, { color: theme.text.primary }]}>
                      {isUploadingAdProof ? 'Uploading...' : 'Change Image'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.proofUploadButton, { borderColor: theme.border.light }]}
                  onPress={handlePickAdProofImage}
                  disabled={isUploadingAdProof}
                >
                  <Text style={[styles.proofUploadText, { color: theme.text.primary }]}>
                    {isUploadingAdProof ? 'Uploading...' : 'Upload Proof'}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Auto-renew</Text>
                <Switch value={autoRenew} onValueChange={setAutoRenew} />
              </View>
              <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                Submitted ads require admin approval before going live.
              </Text>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => setShowPromoteModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSubmitBookAd}
                disabled={isSubmittingAd}
              >
                <Text style={styles.saveButtonText}>{isSubmittingAd ? 'Submitting...' : 'Submit Ad'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Purchase Modal - Modern Redesign */}
      <Modal
        visible={showPurchaseModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowPurchaseModal(false);
          setProofImage(null);
          setPaymentReference('');
          setPaymentNotes('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            {/* Header with gradient */}
            <View style={[styles.modalHeaderModern, { backgroundColor: theme.accent.primary }]}>
              <View>
                <Text style={styles.modalTitleModern}>Complete Purchase</Text>
                <Text style={styles.modalSubtitleModern}>{book.title}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowPurchaseModal(false);
                  setProofImage(null);
                  setPaymentReference('');
                  setPaymentNotes('');
                }}
                style={styles.closeButtonModern}
              >
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Price Summary Card */}
              <View style={[styles.summaryCard, { backgroundColor: theme.background.secondary }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelModern, { color: theme.text.secondary }]}>Amount to Pay</Text>
                  <Text style={[styles.summaryPriceModern, { color: theme.accent.primary }]}>
                    {book.currency} {currentPrice.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Payment Method Selection */}
              <View style={styles.inputGroupModern}>
                <Text style={[styles.labelModern, { color: theme.text.primary }]}>Payment Method</Text>
                {paymentMethods.length === 0 ? (
                  <Text style={[styles.labelHint, { color: theme.text.tertiary }]}>
                    No payment methods configured. Please contact support.
                  </Text>
                ) : (
                  <View style={styles.paymentMethodsGrid}>
                    {paymentMethods.map(method => {
                      const isSelected = paymentMethod === method.name;
                      const iconColor = isSelected ? theme.accent.primary : theme.text.secondary;

                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.paymentMethodCard,
                            {
                              backgroundColor: isSelected ? theme.accent.primary + '12' : theme.background.secondary,
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected ? theme.accent.primary : theme.border.light,
                            },
                          ]}
                          onPress={() => {
                            setSelectedPaymentMethod(method);
                            setPaymentMethod(method.name);
                          }}
                        >
                          {method.type === 'mobile_money' && <Smartphone size={24} color={iconColor} />}
                          {method.type === 'bank_transfer' && <Building2 size={24} color={iconColor} />}
                          {method.type === 'card' && <CreditCard size={24} color={iconColor} />}
                          {method.type === 'cash' && <DollarSign size={24} color={iconColor} />}
                          {method.type === 'other' && <CreditCard size={24} color={iconColor} />}
                          <Text
                            style={[
                              styles.paymentMethodLabel,
                              { color: isSelected ? theme.accent.primary : theme.text.primary },
                            ]}
                          >
                            {(method.display_name || method.name)
                              .replace('_', ' ')
                              .replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                          {isSelected && (
                            <View style={[styles.selectedBadge, { borderColor: theme.accent.primary }]}>
                              <Check size={14} color={theme.accent.primary} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {selectedPaymentMethod && (
                <View style={[styles.paymentInstructionsCard, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}>
                  <Text style={[styles.paymentInstructionsTitle, { color: theme.text.primary }]}>
                    Payment Instructions
                  </Text>
                  {selectedPaymentMethod.setup_instructions ? (
                    <Text style={[styles.paymentInstructionsText, { color: theme.text.secondary }]}>
                      {selectedPaymentMethod.setup_instructions}
                    </Text>
                  ) : selectedPaymentMethod.description ? (
                    <Text style={[styles.paymentInstructionsText, { color: theme.text.secondary }]}>
                      {selectedPaymentMethod.description}
                    </Text>
                  ) : (
                    <Text style={[styles.paymentInstructionsText, { color: theme.text.tertiary }]}>
                      No instructions set for this method. Please contact support.
                    </Text>
                  )}
                  <Text style={[styles.paymentInstructionsHint, { color: theme.text.tertiary }]}>
                    Admins can update instructions in Admin → Payment Methods.
                  </Text>
                </View>
              )}

              {/* Payment Reference */}
              <View style={styles.inputGroupModern}>
                <Text style={[styles.labelModern, { color: theme.text.primary }]}>Transaction Reference</Text>
                <Text style={[styles.labelHint, { color: theme.text.tertiary }]}>
                  Enter your payment transaction reference number
                </Text>
                <TextInput
                  style={[styles.inputModern, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                  placeholder="e.g., MTN123456789 or ZB123456"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              {/* Payment Notes */}
              <View style={styles.inputGroupModern}>
                <Text style={[styles.labelModern, { color: theme.text.primary }]}>Additional Notes (Optional)</Text>
                <TextInput
                  style={[styles.inputModern, styles.textAreaModern, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  placeholder="Any additional information about your payment..."
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Proof of Payment Upload */}
              <View style={styles.inputGroupModern}>
                <Text style={[styles.labelModern, { color: theme.text.primary }]}>Proof of Payment *</Text>
                <Text style={[styles.labelHint, { color: theme.text.tertiary }]}>
                  Upload a screenshot or photo of your payment receipt
                </Text>
                {proofImage ? (
                  <View style={styles.proofImageContainer}>
                    <Image source={{ uri: proofImage }} style={styles.proofImagePreview} />
                    <TouchableOpacity
                      style={[styles.removeProofButton, { backgroundColor: '#EF4444' }]}
                      onPress={() => setProofImage(null)}
                    >
                      <X size={16} color="#FFF" />
                      <Text style={styles.removeProofText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadProofButton, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}
                    onPress={handlePickProofImage}
                    disabled={isUploadingProof}
                  >
                    {isUploadingProof ? (
                      <ActivityIndicator color={theme.accent.primary} />
                    ) : (
                      <>
                        <Upload size={24} color={theme.accent.primary} />
                        <Text style={[styles.uploadProofText, { color: theme.accent.primary }]}>
                          Upload Proof of Payment
                        </Text>
                        <Text style={[styles.uploadProofHint, { color: theme.text.tertiary }]}>
                          Tap to select image from gallery
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Info Banner */}
              <View style={[styles.infoBanner, { backgroundColor: theme.accent.primary + '15', borderLeftColor: theme.accent.primary }]}>
                <Text style={[styles.infoBannerText, { color: theme.text.secondary }]}>
                  Your payment will be reviewed by our team. Access to the book will be granted once your payment is verified.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { 
                    backgroundColor: proofImage && paymentMethod ? theme.accent.primary : theme.text.tertiary,
                    opacity: isPurchasing ? 0.7 : 1,
                  }
                ]}
                onPress={handleConfirmPurchase}
                disabled={isPurchasing || !proofImage || !paymentMethod}
              >
                {isPurchasing ? (
                  <>
                    <ActivityIndicator color="#FFF" />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </>
                ) : (
                  <>
                    <Check size={22} color="#FFF" />
                    <Text style={styles.submitButtonText}>Submit Payment for Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coverSection: {
    padding: 20,
    alignItems: 'center',
  },
  coverImage: {
    width: 200,
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: 200,
    height: 300,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 20,
    marginTop: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  featuredBadge: {
    padding: 8,
    borderRadius: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  chaptersSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  chapterItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  chapterNumber: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  chapterDescription: {
    fontSize: 12,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  originalPrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
  },
  saleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    minHeight: '70%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalTitleModern: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  modalSubtitleModern: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  closeButtonModern: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -4,
  },
  modalBody: {
    paddingHorizontal: 24,
  },
  modalBodyContent: {
    paddingTop: 20,
    paddingBottom: 56,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabelModern: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryPriceModern: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  inputGroupModern: {
    marginBottom: 24,
  },
  labelModern: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  labelHint: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  inputModern: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 52,
  },
  textAreaModern: {
    minHeight: 100,
    paddingTop: 16,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  paymentMethodCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInstructionsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  paymentInstructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  paymentInstructionsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  paymentInstructionsHint: {
    fontSize: 12,
    marginTop: 8,
  },
  uploadProofButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  uploadProofText: {
    fontSize: 16,
    fontWeight: '700',
  },
  uploadProofHint: {
    fontSize: 13,
  },
  proofImageContainer: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  proofImagePreview: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  removeProofButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  removeProofText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  infoBanner: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 24,
    marginTop: 8,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 18,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  purchaseSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: '45%',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  rowInput: {
    flex: 1,
  },
  proofUploadButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  proofUploadText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  proofImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  packageGrid: {
    gap: 10,
    marginBottom: 12,
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  packageMeta: {
    fontSize: 12,
  },
  promoteButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  promoteButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});


