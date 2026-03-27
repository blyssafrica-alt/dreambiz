import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, CheckCircle, X, Check, Smartphone, Building2, DollarSign, Upload } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { useProducts } from '@/contexts/ProductContext';
import { CartStepper } from '@/components/cart';
import { CART_SPACING } from '@/constants/cart-design';
import { supabase } from '@/lib/supabase';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 100 : 90;

interface PaymentMethodRow {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type: string;
  setup_instructions?: string;
  display_order: number;
}

export default function CheckoutScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { storeCart, storeCartCount, getProductById, checkoutCartWithPayment } = useProducts();
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ total: number; currency: string } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodRow | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const subtotal = storeCart.reduce((sum, item) => {
    const p = getProductById(item.product.id) ?? item.product;
    const unit = p.salePrice != null ? p.salePrice : p.basePrice;
    return sum + unit * item.quantity;
  }, 0);
  const currency = storeCart[0]?.product.currency ?? 'USD';

  const loadPaymentMethods = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      if (data?.length) {
        setPaymentMethods(data);
        setSelectedPaymentMethod(data[0]);
        setPaymentMethod(data[0].name);
      }
    } catch (e) {
      console.error('Load payment methods:', e);
    }
  }, []);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  const handlePickProofImage = useCallback(async () => {
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
          const fileName = buildAssetFileName(asset, 'store-payment-proof');
          const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
          const filePath = `payment_proofs/${fileName}`;
          let contentType = 'image/jpeg';
          const mimeMap: Record<string, string> = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
          };
          contentType = mimeMap[fileExt] || 'image/jpeg';
          const publicUrl = await uploadBase64ToStorage(supabase, {
            bucket: 'payment_proofs',
            filePath,
            base64,
            contentType,
            upsert: false,
          });
          setProofImage(publicUrl);
        } catch (err: any) {
          Alert.alert('Upload Error', err?.message ?? 'Failed to upload proof');
        } finally {
          setIsUploadingProof(false);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to pick image');
    }
  }, []);

  const handleSubmitPayment = async () => {
    if (storeCart.length === 0) {
      Alert.alert('Empty cart', 'Add items from the cart first.');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method.');
      return;
    }
    if (!proofImage) {
      Alert.alert('Proof Required', 'Please upload proof of payment to complete your order.');
      return;
    }
    setPlacing(true);
    setOrderSuccess(null);
    try {
      const result = await checkoutCartWithPayment({
        paymentMethod,
        paymentReference: paymentReference || undefined,
        paymentNotes: paymentNotes || undefined,
        proofOfPaymentUrl: proofImage,
      });
      if (result) {
        setShowPaymentModal(false);
        setProofImage(null);
        setPaymentReference('');
        setPaymentNotes('');
        setOrderSuccess({ total: result.order.totalAmount, currency: result.order.currency });
      }
    } catch (e: any) {
      Alert.alert('Checkout failed', e?.message ?? 'Could not submit order.');
    } finally {
      setPlacing(false);
    }
  };

  const openPaymentModal = () => {
    setShowPaymentModal(true);
    if (paymentMethods.length && !paymentMethod) {
      setSelectedPaymentMethod(paymentMethods[0]);
      setPaymentMethod(paymentMethods[0].name);
    }
  };

  if (orderSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <PageHeader
            title="Payment submitted"
            subtitle="Verification pending"
            icon={CheckCircle}
            iconGradient={['#10B981', '#059669']}
            leftAction={
              <TouchableOpacity onPress={() => router.replace('/(tabs)/store' as any)} hitSlop={12}>
                <ArrowLeft size={24} color={theme.text.inverse} />
              </TouchableOpacity>
            }
          />
          <View style={styles.successWrap}>
            <CheckCircle size={64} color={theme.accent.success} />
            <Text style={[styles.successTitle, { color: theme.text.primary }]}>Payment submitted for verification</Text>
            <Text style={[styles.successSub, { color: theme.text.secondary }]}>
              {orderSuccess.currency} {orderSuccess.total.toFixed(2)}
            </Text>
            <Text style={[styles.successNote, { color: theme.text.tertiary }]}>
              You will receive access to your items once your payment is approved by our team.
            </Text>
            <TouchableOpacity
              style={[styles.placeBtn, { backgroundColor: theme.accent.primary }]}
              onPress={() => router.replace('/(tabs)/store' as any)}
            >
              <Text style={styles.placeBtnText}>Back to store</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (storeCart.length === 0 && !placing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <SafeAreaView edges={['top']}>
          <PageHeader
            title="Checkout"
            subtitle="Review & pay"
            icon={CreditCard}
            iconGradient={['#6366F1', '#8B5CF6']}
            leftAction={
              <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                <ArrowLeft size={24} color={theme.text.inverse} />
              </TouchableOpacity>
            }
          />
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>Your cart is empty.</Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent.primary }]} onPress={() => router.back()}>
              <Text style={styles.btnText}>Back to cart</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <PageHeader
          title="Checkout"
          subtitle={`${storeCartCount} item${storeCartCount !== 1 ? 's' : ''}`}
          icon={CreditCard}
          iconGradient={['#6366F1', '#8B5CF6']}
          leftAction={
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <ArrowLeft size={24} color={theme.text.inverse} />
            </TouchableOpacity>
          }
        />
        <CartStepper activeStep="checkout" theme={theme} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Order total</Text>
            <Text style={[styles.total, { color: theme.accent.primary }]}>
              {currency} {subtotal.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.placeBtn, { backgroundColor: theme.accent.primary }]}
            onPress={openPaymentModal}
            disabled={placing}
          >
            <Text style={styles.placeBtnText}>Pay with proof of payment</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowPaymentModal(false);
          setProofImage(null);
          setPaymentReference('');
          setPaymentNotes('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.accent.primary }]}>
              <Text style={styles.modalTitle}>Complete payment</Text>
              <Text style={styles.modalSubtitle}>Store order · {currency} {subtotal.toFixed(2)}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setProofImage(null);
                  setPaymentReference('');
                  setPaymentNotes('');
                }}
                style={styles.modalClose}
              >
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Payment method</Text>
                {!paymentMethods.length ? (
                  <Text style={[styles.hint, { color: theme.text.tertiary }]}>No payment methods configured. Contact support.</Text>
                ) : (
                  <View style={styles.methodGrid}>
                    {paymentMethods.map((method) => {
                      const isSelected = paymentMethod === method.name;
                      const iconColor = isSelected ? theme.accent.primary : theme.text.secondary;
                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.methodCard,
                            {
                              backgroundColor: isSelected ? theme.accent.primary + '18' : theme.background.secondary,
                              borderColor: isSelected ? theme.accent.primary : theme.border.light,
                            },
                          ]}
                          onPress={() => {
                            setSelectedPaymentMethod(method);
                            setPaymentMethod(method.name);
                          }}
                        >
                          {method.type === 'mobile_money' && <Smartphone size={22} color={iconColor} />}
                          {method.type === 'bank_transfer' && <Building2 size={22} color={iconColor} />}
                          {method.type === 'card' && <CreditCard size={22} color={iconColor} />}
                          {method.type === 'cash' && <DollarSign size={22} color={iconColor} />}
                          {(method.type === 'other' || !['mobile_money', 'bank_transfer', 'card', 'cash'].includes(method.type)) && <CreditCard size={22} color={iconColor} />}
                          <Text style={[styles.methodLabel, { color: isSelected ? theme.accent.primary : theme.text.primary }]} numberOfLines={1}>
                            {(method.display_name || method.name).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Text>
                          {isSelected && <Check size={16} color={theme.accent.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {selectedPaymentMethod && (selectedPaymentMethod.setup_instructions || selectedPaymentMethod.description) && (
                <View style={[styles.instructionsCard, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}>
                  <Text style={[styles.instructionsTitle, { color: theme.text.primary }]}>Payment instructions</Text>
                  <Text style={[styles.instructionsText, { color: theme.text.secondary }]}>
                    {selectedPaymentMethod.setup_instructions || selectedPaymentMethod.description}
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Transaction reference</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                  placeholder="e.g. MTN123456789"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.inputArea, { backgroundColor: theme.background.secondary, color: theme.text.primary, borderColor: theme.border.light }]}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  placeholder="Any additional information..."
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Proof of payment *</Text>
                <Text style={[styles.hint, { color: theme.text.tertiary }]}>Upload a screenshot or photo of your payment receipt</Text>
                {proofImage ? (
                  <View style={styles.proofWrap}>
                    <Image source={{ uri: proofImage }} style={styles.proofImage} />
                    <TouchableOpacity style={styles.removeProof} onPress={() => setProofImage(null)}>
                      <X size={16} color="#FFF" />
                      <Text style={styles.removeProofText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadBtn, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}
                    onPress={handlePickProofImage}
                    disabled={isUploadingProof}
                  >
                    {isUploadingProof ? (
                      <ActivityIndicator color={theme.accent.primary} />
                    ) : (
                      <>
                        <Upload size={24} color={theme.accent.primary} />
                        <Text style={[styles.uploadBtnText, { color: theme.accent.primary }]}>Upload proof of payment</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.infoBanner, { backgroundColor: theme.accent.primary + '18', borderLeftColor: theme.accent.primary }]}>
                <Text style={[styles.infoBannerText, { color: theme.text.secondary }]}>
                  Your payment will be reviewed by our team. Access to your items will be granted once payment is verified.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: proofImage && paymentMethod ? theme.accent.primary : theme.text.tertiary },
                  (placing || !proofImage || !paymentMethod) && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmitPayment}
                disabled={placing || !proofImage || !paymentMethod}
              >
                {placing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Check size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>Submit payment for verification</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: CART_SPACING.lg },
  card: {
    borderRadius: 16,
    padding: CART_SPACING.lg,
    marginBottom: CART_SPACING.lg,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  total: { fontSize: 24, fontWeight: '800' },
  placeBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  placeBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, marginBottom: 20 },
  btn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successTitle: { fontSize: 20, fontWeight: '800', marginTop: 20, textAlign: 'center' },
  successSub: { fontSize: 18, marginTop: 8 },
  successNote: { fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { padding: 20, paddingTop: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, position: 'relative' },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  modalSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },
  modalClose: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalBody: { maxHeight: 480 },
  modalBodyContent: { padding: 20, paddingBottom: 40 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 13, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  inputArea: { minHeight: 80, textAlignVertical: 'top' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    minWidth: '47%',
  },
  methodLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  instructionsCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  instructionsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  instructionsText: { fontSize: 13, lineHeight: 20 },
  proofWrap: { marginTop: 8 },
  proofImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#f0f0f0' },
  removeProof: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#EF4444', gap: 6 },
  removeProofText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 12, borderWidth: 1, gap: 10 },
  uploadBtnText: { fontSize: 15, fontWeight: '600' },
  infoBanner: { padding: 14, borderRadius: 12, borderLeftWidth: 4, marginBottom: 24 },
  infoBannerText: { fontSize: 13, lineHeight: 20 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
