import React, { useState, useEffect } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Check, Crown, Building2, Users, HardDrive, Zap, X, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/contexts/PremiumContext';
import { supabase } from '@/lib/supabase';
import type { SubscriptionPlan } from '@/types/premium';
import PageHeader from '@/components/PageHeader';

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  type: string;
}

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { currentPlan, refreshPremiumStatus } = usePremium();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  useEffect(() => {
    loadPlans();
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setPaymentMethods(data);
        if (data.length > 0) {
          setSelectedPaymentMethod(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setPlans(
          data.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            currency: row.currency,
            billingPeriod: row.billing_period,
            features: row.features || [],
            maxBusinesses: row.max_businesses,
            maxUsers: row.max_users,
            maxStorageMb: row.max_storage_mb,
            isActive: row.is_active,
            displayOrder: row.display_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );
      }
    } catch (error: any) {
      console.error('Failed to load plans:', error);
      RNAlert.alert('Error', 'Failed to load subscription plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!user?.id) {
      RNAlert.alert('Error', 'You must be logged in to upgrade');
      return;
    }

    // Check if already on this plan
    if (currentPlan?.id === plan.id) {
      RNAlert.alert('Already Subscribed', 'You are already on this plan.');
      return;
    }

    // Check if trying to downgrade
    if (currentPlan && currentPlan.displayOrder > plan.displayOrder) {
      RNAlert.alert(
        'Downgrade',
        'You are trying to downgrade. Please contact support to change your plan.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Open payment modal instead of directly creating subscription
    setSelectedPlanForPayment(plan);
    setShowPaymentModal(true);
    setReference('');
    setNotes('');
    setProofImage(null);
  };

  const handlePickProofImage = async () => {
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
          const base64 = asset.base64
            ? asset.base64
            : await FileSystem.readAsStringAsync(asset.uri, {
                encoding: 'base64',
              });
          const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `subscription-proof-${Date.now()}.${fileExt}`;
          const filePath = `payment_proofs/${fileName}`;

          // Determine correct MIME type
          let contentType = 'image/jpeg';
          if (asset.mimeType) {
            const mimeTypes = asset.mimeType.split(',').map(m => m.trim());
            const imageMime = mimeTypes.find(m => m.startsWith('image/'));
            if (imageMime) {
              contentType = imageMime;
            }
          }
          
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

          const { error } = await supabase.storage
            .from('payment_proofs')
            .upload(filePath, decode(base64), {
              contentType: contentType,
              upsert: false,
            });

          if (error) throw error;

          const { data: publicUrlData } = supabase.storage
            .from('payment_proofs')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            setProofImage(publicUrlData.publicUrl);
          }
        } catch (error: any) {
          console.error('Error uploading proof:', error);
          RNAlert.alert('Upload Error', error.message || 'Failed to upload proof of payment');
        } finally {
          setIsUploadingProof(false);
        }
      }
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedPlanForPayment || !selectedPaymentMethod || !user) return;

    if (!proofImage) {
      RNAlert.alert('Proof Required', 'Please upload proof of payment to continue');
      return;
    }

    try {
      setIsSubmittingPayment(true);

      // Check for user discounts
      const { data: userDiscount } = await supabase
        .from('user_discounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .or(`applicable_plans.is.null,applicable_plans.cs.{${selectedPlanForPayment.id}}`)
        .gt('valid_until', new Date().toISOString())
        .order('discount_percentage', { ascending: false })
        .limit(1)
        .single();

      let discountPercentage = 0;
      if (userDiscount) {
        discountPercentage = parseFloat(userDiscount.discount_percentage);
      }

      // Calculate final price
      const finalPrice = selectedPlanForPayment.price * (1 - discountPercentage / 100);

      // Create subscription payment record with pending status
      const { error } = await supabase
        .from('subscription_payments')
        .insert({
          user_id: user.id,
          plan_id: selectedPlanForPayment.id,
          amount: finalPrice,
          currency: selectedPlanForPayment.currency,
          payment_method: selectedPaymentMethod.name,
          payment_date: new Date().toISOString(),
          reference: reference || null,
          notes: notes || null,
          proof_of_payment_url: proofImage,
          verification_status: 'pending',
        });

      if (error) throw error;

      setShowPaymentModal(false);
      setSelectedPlanForPayment(null);
      setReference('');
      setNotes('');
      setProofImage(null);

      RNAlert.alert(
        'Payment Submitted!',
        'Your payment has been submitted for verification. You will be notified once it is approved by an admin.',
        [
          {
            text: 'OK',
            onPress: () => {
              refreshPremiumStatus();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to submit payment:', error);
      RNAlert.alert('Error', error.message || 'Failed to submit payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    if (plan.price === 0) return 'Free';
    const symbol = plan.currency === 'USD' ? '$' : plan.currency;
    const period = plan.billingPeriod === 'monthly' ? '/mo' : plan.billingPeriod === 'yearly' ? '/yr' : '';
    return `${symbol}${plan.price.toFixed(2)}${period}`;
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return '#6B7280';
      case 'starter':
        return '#3B82F6';
      case 'professional':
        return '#8B5CF6';
      case 'enterprise':
        return '#F59E0B';
      default:
        return theme.accent.primary;
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentPlan?.id === plan.id;
    const planColor = getPlanColor(plan.name);

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          {
            backgroundColor: theme.background.card,
            borderColor: isCurrentPlan ? planColor : theme.border.light,
            borderWidth: isCurrentPlan ? 2 : 1,
          },
        ]}
      >
        {isCurrentPlan && (
          <View style={[styles.currentBadge, { backgroundColor: planColor }]}>
            <Check size={14} color="#FFF" />
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: planColor + '20' }]}>
            <Crown size={24} color={planColor} />
          </View>
          <View style={styles.planTitleSection}>
            <Text style={[styles.planName, { color: theme.text.primary }]}>{plan.name}</Text>
            <Text style={[styles.planPrice, { color: planColor }]}>{formatPrice(plan)}</Text>
          </View>
        </View>

        {plan.description && (
          <Text style={[styles.planDescription, { color: theme.text.secondary }]}>
            {plan.description}
          </Text>
        )}

        <View style={styles.featuresSection}>
          <View style={styles.featureRow}>
            <Building2 size={16} color={theme.text.secondary} />
            <Text style={[styles.featureText, { color: theme.text.primary }]}>
              {plan.maxBusinesses === -1 ? 'Unlimited' : plan.maxBusinesses} Businesses
            </Text>
          </View>
          <View style={styles.featureRow}>
            <Users size={16} color={theme.text.secondary} />
            <Text style={[styles.featureText, { color: theme.text.primary }]}>
              {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} Users
            </Text>
          </View>
          <View style={styles.featureRow}>
            <HardDrive size={16} color={theme.text.secondary} />
            <Text style={[styles.featureText, { color: theme.text.primary }]}>
              {plan.maxStorageMb === -1 ? 'Unlimited' : `${plan.maxStorageMb} MB`} Storage
            </Text>
          </View>
          {plan.features && plan.features.length > 0 && (
            <View style={styles.featureRow}>
              <Zap size={16} color={theme.text.secondary} />
              <Text style={[styles.featureText, { color: theme.text.primary }]}>
                {plan.features.length === 1 && plan.features[0] === '*' 
                  ? 'All Features' 
                  : `${plan.features.length} Premium Features`}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.upgradeButton,
            {
              backgroundColor: isCurrentPlan ? theme.background.secondary : planColor,
            },
          ]}
          onPress={() => handleUpgrade(plan)}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? (
            <Text style={styles.upgradeButtonText}>Current Plan</Text>
          ) : (
            <Text style={styles.upgradeButtonText}>
              {currentPlan ? 'Upgrade' : 'Subscribe'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <PageHeader
          title="Subscription Plans"
          subtitle="Choose the plan that's right for your business"
          icon={Crown}
          iconGradient={['#F59E0B', '#D97706']}
          leftAction={
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
          }
        />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {currentPlan && (
              <View style={[styles.currentPlanBanner, { backgroundColor: theme.accent.primary + '20' }]}>
                <Text style={[styles.currentPlanText, { color: theme.accent.primary }]}>
                  Current Plan: {currentPlan.name}
                </Text>
              </View>
            )}

            {plans.map((plan) => renderPlanCard(plan))}

            <View style={[styles.infoBox, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.infoTitle, { color: theme.text.primary }]}>
                Need Help Choosing?
              </Text>
              <Text style={[styles.infoText, { color: theme.text.secondary }]}>
                All plans include core features. Higher plans offer more businesses, users, and storage. 
                You can upgrade or downgrade at any time.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Complete Payment
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentModal(false);
                  setSelectedPlanForPayment(null);
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedPlanForPayment && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <View style={[styles.paymentPlanInfo, { backgroundColor: theme.background.secondary }]}>
                  <Text style={[styles.paymentPlanName, { color: theme.text.primary }]}>
                    {selectedPlanForPayment.name} Plan
                  </Text>
                  <Text style={[styles.paymentPlanPrice, { color: theme.accent.primary }]}>
                    {formatPrice(selectedPlanForPayment)}
                  </Text>
                </View>

                {/* Payment Method Selection */}
                <View style={styles.paymentSection}>
                  <Text style={[styles.paymentSectionTitle, { color: theme.text.primary }]}>
                    Select Payment Method *
                  </Text>
                  {paymentMethods.length === 0 ? (
                    <Text style={[styles.paymentSectionText, { color: theme.text.secondary }]}>
                      No payment methods available. Please contact support.
                    </Text>
                  ) : (
                    <View style={styles.paymentMethodsList}>
                      {paymentMethods.map((method) => (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.paymentMethodCard,
                            {
                              backgroundColor: theme.background.secondary,
                              borderColor: selectedPaymentMethod?.id === method.id
                                ? theme.accent.primary
                                : theme.border.light,
                              borderWidth: selectedPaymentMethod?.id === method.id ? 2 : 1,
                            },
                          ]}
                          onPress={() => setSelectedPaymentMethod(method)}
                        >
                          <View style={styles.paymentMethodInfo}>
                            <Text style={[styles.paymentMethodName, { color: theme.text.primary }]}>
                              {method.display_name || method.name}
                            </Text>
                            <Text style={[styles.paymentMethodType, { color: theme.text.secondary }]}>
                              {method.type}
                            </Text>
                          </View>
                          {selectedPaymentMethod?.id === method.id && (
                            <Check size={20} color={theme.accent.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Reference Number */}
                <View style={styles.paymentSection}>
                  <Text style={[styles.paymentSectionTitle, { color: theme.text.primary }]}>
                    Payment Reference (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.paymentInput,
                      {
                        backgroundColor: theme.background.secondary,
                        color: theme.text.primary,
                        borderColor: theme.border.light,
                      },
                    ]}
                    value={reference}
                    onChangeText={setReference}
                    placeholder="Enter transaction reference"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>

                {/* Notes */}
                <View style={styles.paymentSection}>
                  <Text style={[styles.paymentSectionTitle, { color: theme.text.primary }]}>
                    Notes (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.paymentInput,
                      styles.paymentTextArea,
                      {
                        backgroundColor: theme.background.secondary,
                        color: theme.text.primary,
                        borderColor: theme.border.light,
                      },
                    ]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Additional information"
                    placeholderTextColor={theme.text.tertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Proof of Payment Upload */}
                <View style={styles.paymentSection}>
                  <Text style={[styles.paymentSectionTitle, { color: theme.text.primary }]}>
                    Proof of Payment *
                  </Text>
                  <Text style={[styles.paymentSectionHint, { color: theme.text.secondary }]}>
                    Upload a screenshot or photo of your payment receipt
                  </Text>
                  {proofImage ? (
                    <View style={styles.proofImageContainer}>
                      <Image source={{ uri: proofImage }} style={styles.proofImagePreview} />
                      <TouchableOpacity
                        style={[styles.removeProofButton, { backgroundColor: theme.accent.danger }]}
                        onPress={() => setProofImage(null)}
                      >
                        <X size={16} color="#FFF" />
                        <Text style={styles.removeProofText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.uploadProofButton,
                        {
                          backgroundColor: theme.background.secondary,
                          borderColor: theme.border.light,
                        },
                      ]}
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
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitPaymentButton,
                    {
                      backgroundColor: theme.accent.primary,
                      opacity: (!selectedPaymentMethod || !proofImage || isSubmittingPayment) ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleSubmitPayment}
                  disabled={!selectedPaymentMethod || !proofImage || isSubmittingPayment}
                >
                  {isSubmittingPayment ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitPaymentButtonText}>Submit Payment for Verification</Text>
                  )}
                </TouchableOpacity>

                <Text style={[styles.paymentInfoText, { color: theme.text.secondary }]}>
                  Your payment will be reviewed by an administrator. You will be notified once it is approved.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  currentPlanBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentPlanText: {
    fontSize: 14,
    fontWeight: '600',
  },
  planCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    position: 'relative',
  },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  currentBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planTitleSection: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  upgradeButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
    padding: 20,
  },
  paymentPlanInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  paymentPlanName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentPlanPrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  paymentSection: {
    marginBottom: 24,
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentSectionHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  paymentSectionText: {
    fontSize: 14,
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethodType: {
    fontSize: 13,
  },
  paymentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  paymentTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  proofImageContainer: {
    marginTop: 12,
  },
  proofImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  removeProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  removeProofText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadProofButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  uploadProofText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitPaymentButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitPaymentButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  paymentInfoText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

