import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { X, Crown, Check, Zap, CreditCard, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { supabase } from '@/lib/supabase';
import type { SubscriptionPlan } from '@/types/premium';

interface PremiumUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  type: string;
}

export default function PremiumUpgradeModal({
  visible,
  onClose,
  title = 'Upgrade to Premium',
  message = 'Unlock this feature and more with a premium plan',
  feature,
}: PremiumUpgradeModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { currentPlan, refreshPremiumStatus } = usePremium();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedPlans = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          price: parseFloat(row.price),
          currency: row.currency,
          billingPeriod: row.billing_period,
          features: row.features || [],
          maxBusinesses: row.max_businesses,
          maxUsers: row.max_users,
          maxStorageMb: row.max_storage,
          isActive: row.is_active,
          displayOrder: row.display_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        setPlans(mappedPlans);
        if (mappedPlans.length > 0 && !selectedPlan) {
          setSelectedPlan(mappedPlans[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlan]);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setPaymentMethods(data);
        if (data.length > 0 && !selectedPaymentMethod) {
          setSelectedPaymentMethod(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  }, [selectedPaymentMethod]);

  useEffect(() => {
    if (visible) {
      loadPlans();
      loadPaymentMethods();
      setStep('plans');
      setReference('');
      setNotes('');
      setProofImage(null);
    }
  }, [visible, loadPlans, loadPaymentMethods]);

  const formatPrice = (plan: SubscriptionPlan) => {
    return `${plan.currency} ${plan.price.toFixed(2)}`;
  };

  const getBillingText = (period: string) => {
    if (period === 'monthly') return '/month';
    if (period === 'yearly') return '/year';
    if (period === 'lifetime') return 'one-time';
    return `/${period}`;
  };

  const getFeatureList = (plan: SubscriptionPlan) => {
    const features: string[] = [];
    
    if (plan.maxBusinesses === -1) {
      features.push('Unlimited businesses');
    } else {
      features.push(`Up to ${plan.maxBusinesses} business${plan.maxBusinesses !== 1 ? 'es' : ''}`);
    }

    if (plan.maxUsers === -1) {
      features.push('Unlimited users');
    } else {
      features.push(`Up to ${plan.maxUsers} user${plan.maxUsers !== 1 ? 's' : ''}`);
    }

    if (plan.maxStorageMb === -1) {
      features.push('Unlimited storage');
    } else {
      const storageMB = plan.maxStorageMb;
      if (storageMB >= 1000) {
        features.push(`${(storageMB / 1000).toFixed(0)} GB storage`);
      } else {
        features.push(`${storageMB} MB storage`);
      }
    }

    features.push('Priority support');
    features.push('All premium features');
    
    return features;
  };

  const handleContinueToPayment = () => {
    if (!selectedPlan) return;
    setStep('payment');
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
          setIsUploading(true);
          try {
            const fileExt = asset.uri.split('.').pop() || 'jpg';
            const fileName = `subscription-proof-${Date.now()}.${fileExt}`;
            const filePath = `payment_proofs/${fileName}`;

            const { error } = await supabase.storage
              .from('payment_proofs')
              .upload(filePath, decode(asset.base64), {
                contentType: asset.mimeType || 'image/jpeg',
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
            Alert.alert('Upload Error', error.message || 'Failed to upload proof of payment');
          } finally {
            setIsUploading(false);
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedPlan || !selectedPaymentMethod || !user) return;

    if (!proofImage) {
      Alert.alert('Proof Required', 'Please upload proof of payment to continue');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('subscription_payments')
        .insert({
          user_id: user.id,
          plan_id: selectedPlan.id,
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          payment_method: selectedPaymentMethod.name,
          payment_date: new Date().toISOString(),
          reference: reference || null,
          notes: notes || null,
          proof_of_payment_url: proofImage,
          verification_status: 'pending',
        });

      if (error) throw error;

      Alert.alert(
        'Payment Submitted!',
        'Your payment has been submitted for verification. You will be notified once it is approved by an admin.',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              refreshPremiumStatus();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to submit payment:', error);
      Alert.alert('Error', error.message || 'Failed to submit payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background.card }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Crown size={24} color={theme.accent.primary} />
              <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
                {title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 'plans' ? (
              <>
                <View style={[styles.messageCard, { backgroundColor: theme.surface.warning }]}>
                  <Zap size={20} color={theme.accent.warning} />
                  <Text style={[styles.messageText, { color: theme.text.primary }]}>
                    {message}
                  </Text>
                </View>

            {feature && (
              <Text style={[styles.featureText, { color: theme.text.secondary }]}>
                Feature: <Text style={{ fontWeight: '600' }}>{feature}</Text>
              </Text>
            )}

            {currentPlan && (
              <View style={[styles.currentPlanCard, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.currentPlanLabel, { color: theme.text.tertiary }]}>
                  Current Plan
                </Text>
                <Text style={[styles.currentPlanName, { color: theme.text.primary }]}>
                  {currentPlan.name}
                </Text>
              </View>
            )}

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.accent.primary} />
                <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
                  Loading plans...
                </Text>
              </View>
            ) : plans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                  No plans available at the moment
                </Text>
              </View>
            ) : (
              <View style={styles.plansContainer}>
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlan?.id === plan.id;
                  const features = getFeatureList(plan);
                  
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: theme.background.secondary,
                          borderColor: selectedPlan?.id === plan.id 
                            ? theme.accent.primary 
                            : theme.border.light,
                          borderWidth: selectedPlan?.id === plan.id ? 2 : 1,
                        },
                        isCurrentPlan && styles.currentPlanHighlight,
                      ]}
                      onPress={() => setSelectedPlan(plan)}
                      disabled={isCurrentPlan}
                    >
                      {plan.billingPeriod === 'yearly' && (
                        <View style={[styles.popularBadge, { backgroundColor: theme.accent.success }]}>
                          <Text style={styles.popularText}>Most Popular</Text>
                        </View>
                      )}

                      <Text style={[styles.planName, { color: theme.text.primary }]}>
                        {plan.name}
                      </Text>
                      
                      {plan.description && (
                        <Text style={[styles.planDescription, { color: theme.text.secondary }]}>
                          {plan.description}
                        </Text>
                      )}

                      <View style={styles.priceContainer}>
                        <Text style={[styles.planPrice, { color: theme.accent.primary }]}>
                          {formatPrice(plan)}
                        </Text>
                        <Text style={[styles.billingPeriod, { color: theme.text.tertiary }]}>
                          {getBillingText(plan.billingPeriod)}
                        </Text>
                      </View>

                      <View style={styles.featuresContainer}>
                        {features.map((feature, index) => (
                          <View key={index} style={styles.featureRow}>
                            <Check size={16} color={theme.accent.success} />
                            <Text style={[styles.featureItem, { color: theme.text.primary }]}>
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {isCurrentPlan && (
                        <View style={[styles.currentBadge, { backgroundColor: theme.surface.info }]}>
                          <Text style={[styles.currentBadgeText, { color: theme.accent.info }]}>
                            Current Plan
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
              </>
            ) : (
              <>
                <View style={[styles.paymentHeader, { backgroundColor: theme.background.secondary }]}>
                  <Text style={[styles.paymentPlanName, { color: theme.text.primary }]}>
                    {selectedPlan?.name}
                  </Text>
                  <Text style={[styles.paymentAmount, { color: theme.accent.primary }]}>
                    {selectedPlan?.currency} {selectedPlan?.price.toFixed(2)}
                  </Text>
                  <Text style={[styles.paymentPeriod, { color: theme.text.tertiary }]}>
                    {getBillingText(selectedPlan?.billingPeriod || 'monthly')}
                  </Text>
                </View>

                {paymentMethods.length === 0 ? (
                  <View style={[styles.warningCard, { backgroundColor: theme.surface.warning }]}>
                    <Text style={[styles.warningText, { color: theme.text.primary }]}>
                      No payment methods available. Please contact support.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.section}>
                      <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>
                        Select Payment Method *
                      </Text>
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
                            <CreditCard size={24} color={theme.accent.primary} />
                            <View style={styles.paymentMethodInfo}>
                              <Text style={[styles.paymentMethodName, { color: theme.text.primary }]}>
                                {method.display_name}
                              </Text>
                              <Text style={[styles.paymentMethodType, { color: theme.text.secondary }]}>
                                {method.type.replace('_', ' ')}
                              </Text>
                            </View>
                            {selectedPaymentMethod?.id === method.id && (
                              <Check size={20} color={theme.accent.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.section}>
                      <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>
                        Payment Reference
                      </Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          { backgroundColor: theme.background.secondary, color: theme.text.primary },
                        ]}
                        value={reference}
                        onChangeText={setReference}
                        placeholder="Transaction reference number"
                        placeholderTextColor={theme.text.tertiary}
                      />
                    </View>

                    <View style={styles.section}>
                      <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>
                        Notes
                      </Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          styles.textArea,
                          { backgroundColor: theme.background.secondary, color: theme.text.primary },
                        ]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Additional information..."
                        placeholderTextColor={theme.text.tertiary}
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    <View style={styles.section}>
                      <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>
                        Proof of Payment *
                      </Text>
                      <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                        Upload a receipt, screenshot, or photo of your payment
                      </Text>
                      {proofImage ? (
                        <View style={styles.proofImageContainer}>
                          <Image source={{ uri: proofImage }} style={styles.proofImage} />
                          <TouchableOpacity
                            style={[styles.removeProofButton, { backgroundColor: theme.accent.danger }]}
                            onPress={() => setProofImage(null)}
                          >
                            <X size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.uploadButton,
                            {
                              backgroundColor: theme.background.secondary,
                              borderColor: theme.border.light,
                            },
                          ]}
                          onPress={handlePickProofImage}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <ActivityIndicator color={theme.accent.primary} />
                          ) : (
                            <>
                              <Camera size={24} color={theme.accent.primary} />
                              <Text style={[styles.uploadButtonText, { color: theme.text.primary }]}>
                                Upload Proof of Payment
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={[styles.infoCard, { backgroundColor: theme.surface.info }]}>
                      <Text style={[styles.infoText, { color: theme.text.primary }]}>
                        Your payment will be verified by an admin. You will be notified once your
                        subscription is activated.
                      </Text>
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          {step === 'plans' ? (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  { backgroundColor: theme.accent.primary },
                  (!selectedPlan || selectedPlan?.id === currentPlan?.id) && styles.disabledButton,
                ]}
                onPress={handleContinueToPayment}
                disabled={!selectedPlan || selectedPlan?.id === currentPlan?.id}
              >
                <Crown size={20} color="#FFF" />
                <Text style={styles.upgradeButtonText}>
                  Continue to Payment
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => setStep('plans')}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>
                  Back
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  { backgroundColor: theme.accent.primary },
                  (!selectedPaymentMethod || !proofImage) && styles.disabledButton,
                ]}
                onPress={handleSubmitPayment}
                disabled={!selectedPaymentMethod || !proofImage || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Check size={20} color="#FFF" />
                    <Text style={styles.upgradeButtonText}>
                      Submit for Verification
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  featureText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  currentPlanCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentPlanLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  plansContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  currentPlanHighlight: {
    opacity: 0.6,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFF',
    textTransform: 'uppercase',
  },
  planName: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  billingPeriod: {
    fontSize: 16,
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureItem: {
    fontSize: 15,
    flex: 1,
  },
  currentBadge: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  currentBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  upgradeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  paymentHeader: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentPlanName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  paymentPeriod: {
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  paymentMethodType: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  proofImageContainer: {
    position: 'relative',
    marginTop: 8,
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeProofButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  warningCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
