import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
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
} from 'react-native';
import * as Linking from 'expo-linking';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ShoppingCart, Star, BookOpen, Check, X, CreditCard, Smartphone, Building2, DollarSign, Upload, Image as ImageIcon, Camera, Loader } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBookBySlug } from '@/lib/book-service';
import type { Book } from '@/types/books';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { business } = useBusiness();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other'>('mobile_money');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'none' | 'pending' | 'completed' | 'failed'>('none');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  useEffect(() => {
    loadBook();
    checkPurchaseStatus();
  }, [id]);

  const loadBook = async () => {
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
  };

  const checkPurchaseStatus = async () => {
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
      // User hasn't purchased this book
      setHasPurchased(false);
      setPurchaseStatus('none');
    }
  };

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
        if (asset.base64) {
          setIsUploadingProof(true);
          try {
            const fileExt = asset.uri.split('.').pop() || 'jpg';
            const fileName = `book-payment-proof-${Date.now()}.${fileExt}`;
            const filePath = `payment_proofs/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('payment_proofs')
              .upload(filePath, decode(asset.base64), {
                contentType: asset.mimeType || 'image/jpeg',
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
              .from('payment_proofs')
              .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
              setProofImage(publicUrlData.publicUrl);
            }
          } catch (error: any) {
            console.error('Error uploading proof:', error);
            Alert.alert('Upload Error', error.message || 'Failed to upload proof of payment');
          } finally {
            setIsUploadingProof(false);
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleConfirmPurchase = async () => {
    if (!book || !user || !business) return;

    if (!proofImage) {
      Alert.alert('Proof Required', 'Please upload proof of payment to complete your purchase');
      return;
    }

    try {
      setIsPurchasing(true);
      const price = getCurrentPrice();

      // Create purchase record with pending status
      const { data, error } = await supabase
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
        })
        .select()
        .single();

      if (error) throw error;

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

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                <View style={styles.paymentMethodsGrid}>
                  {(['mobile_money', 'bank_transfer', 'card', 'cash'] as const).map(method => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodCard,
                        {
                          backgroundColor: paymentMethod === method 
                            ? theme.accent.primary + '15' 
                            : theme.background.secondary,
                          borderWidth: paymentMethod === method ? 2 : 1,
                          borderColor: paymentMethod === method 
                            ? theme.accent.primary 
                            : theme.border.light,
                        }
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      {method === 'mobile_money' && <Smartphone size={24} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      {method === 'bank_transfer' && <Building2 size={24} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      {method === 'card' && <CreditCard size={24} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      {method === 'cash' && <DollarSign size={24} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      <Text style={[
                        styles.paymentMethodLabel,
                        { color: paymentMethod === method ? theme.accent.primary : theme.text.primary }
                      ]}>
                        {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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
                    backgroundColor: proofImage ? theme.accent.primary : theme.text.tertiary,
                    opacity: isPurchasing ? 0.7 : 1,
                  }
                ]}
                onPress={handleConfirmPurchase}
                disabled={isPurchasing || !proofImage}
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
    padding: 24,
    paddingTop: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentMethodLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
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

