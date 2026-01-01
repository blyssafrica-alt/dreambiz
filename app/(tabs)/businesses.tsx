import { Stack } from 'expo-router';
import { 
  Plus, 
  Building2,
  CheckCircle,
  Trash2,
  ArrowRight,
  X,
  ChevronRight,
  DollarSign,
  Briefcase,
} from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import PageHeader from '@/components/PageHeader';
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { BusinessProfile, BusinessType, BusinessStage, Currency, DreamBigBook } from '@/types/business';
import { DREAMBIG_BOOKS } from '@/constants/books';

const businessTypes: { value: BusinessType; label: string }[] = [
  { value: 'retail', label: 'Retail Shop' },
  { value: 'services', label: 'Services' },
  { value: 'restaurant', label: 'Restaurant/Food' },
  { value: 'salon', label: 'Salon/Beauty' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'construction', label: 'Construction' },
  { value: 'transport', label: 'Transport' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'other', label: 'Other' },
];

const businessStages: { value: BusinessStage; label: string; desc: string }[] = [
  { value: 'idea', label: 'Idea Stage', desc: 'Planning to start' },
  { value: 'running', label: 'Running', desc: 'Already operating' },
  { value: 'growing', label: 'Growing', desc: 'Expanding operations' },
];

export default function BusinessesScreen() {
  const { business: currentBusiness, getAllBusinesses, switchBusiness, deleteBusiness, saveBusiness, checkBusinessLimit } = useBusiness();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ canCreate: boolean; currentCount: number; maxBusinesses: number | null; planName: string | null } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Onboarding form state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    type: 'retail' as BusinessType,
    stage: 'running' as BusinessStage,
    location: '',
    capital: '',
    currency: 'USD' as Currency,
    phone: '',
    dreamBigBook: 'none' as DreamBigBook,
  });

  useEffect(() => {
    loadBusinesses();
    checkLimit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBusinesses = async () => {
    try {
      setIsLoading(true);
      const allBusinesses = await getAllBusinesses();
      setBusinesses(allBusinesses);
    } catch (error) {
      console.error('Failed to load businesses:', error);
      RNAlert.alert('Error', 'Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  };

  const checkLimit = async () => {
    const info = await checkBusinessLimit();
    setLimitInfo(info);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleAddBusiness = () => {
    // Check limit before showing modal
    if (limitInfo && !limitInfo.canCreate) {
      setShowUpgradeModal(true);
      return;
    }
    setShowModal(true);
    setStep(1);
    setFormData({
      name: '',
      owner: '',
      type: 'retail',
      stage: 'running',
      location: '',
      capital: '',
      currency: 'USD',
      phone: '',
      dreamBigBook: 'none',
    });
  };

  const handleCreateBusiness = async () => {
    if (!formData.name || !formData.owner || !formData.location || !formData.capital) {
      RNAlert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      const newBusiness: BusinessProfile = {
        id: '',
        name: formData.name,
        owner: formData.owner,
        type: formData.type,
        stage: formData.stage,
        location: formData.location,
        capital: parseFloat(formData.capital) || 0,
        currency: formData.currency,
        phone: formData.phone,
        dreamBigBook: formData.dreamBigBook,
        createdAt: new Date().toISOString(),
      };

      await saveBusiness(newBusiness);
      await loadBusinesses();
      await checkLimit();
      handleCloseModal();
      RNAlert.alert('Success', 'Business created successfully!');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create business';
      RNAlert.alert('Error', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchBusiness = async (businessId: string) => {
    if (currentBusiness?.id === businessId) {
      RNAlert.alert('Already Active', 'This business is already active');
      return;
    }

    RNAlert.alert(
      'Switch Business',
      'Are you sure you want to switch to this business? All data will be reloaded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              await switchBusiness(businessId);
              await loadBusinesses();
              RNAlert.alert('Success', 'Business switched successfully');
            } catch (error: any) {
              RNAlert.alert('Error', error?.message || 'Failed to switch business');
            }
          },
        },
      ]
    );
  };

  const handleDeleteBusiness = async (businessId: string) => {
    if (currentBusiness?.id === businessId) {
      RNAlert.alert('Cannot Delete', 'Cannot delete the currently active business. Please switch to another business first.');
      return;
    }

    RNAlert.alert(
      'Delete Business',
      'Are you sure you want to delete this business? This action cannot be undone and will delete all associated data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBusiness(businessId);
              await loadBusinesses();
              await checkLimit();
              RNAlert.alert('Success', 'Business deleted successfully');
            } catch (error: any) {
              RNAlert.alert('Error', error?.message || 'Failed to delete business');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setStep(1);
    setFormData({
      name: '',
      owner: '',
      type: 'retail',
      stage: 'running',
      location: '',
      capital: '',
      currency: 'USD',
      phone: '',
      dreamBigBook: 'none',
    });
  };

  const getTypeLabel = (type: BusinessType) => {
    return businessTypes.find(t => t.value === type)?.label || type;
  };

  const getStageLabel = (stage: BusinessStage) => {
    return businessStages.find(s => s.value === stage)?.label || stage;
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Building2 size={48} color={theme.accent.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text.primary }]}>Let&apos;s set up your business</Text>
      <Text style={[styles.stepDesc, { color: theme.text.secondary }]}>
        This will take 2 minutes. Your data stays on your device.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Business Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
          placeholder="e.g. Sarah's Salon"
          placeholderTextColor={theme.text.tertiary}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Owner Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
          placeholder="Your full name"
          placeholderTextColor={theme.text.tertiary}
          value={formData.owner}
          onChangeText={(text) => setFormData({ ...formData, owner: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Phone Number</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
          placeholder="+263..."
          placeholderTextColor={theme.text.tertiary}
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
        />
      </View>

      <TouchableOpacity 
        style={[styles.nextButton, { backgroundColor: theme.accent.primary }]} 
        onPress={() => setStep(2)}
        disabled={!formData.name || !formData.owner}
      >
        <Text style={styles.nextButtonText}>Continue</Text>
        <ChevronRight size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Briefcase size={48} color={theme.accent.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text.primary }]}>About your business</Text>
      <Text style={[styles.stepDesc, { color: theme.text.secondary }]}>
        Help us customize the tools for you
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Business Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {businessTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.chip,
                { backgroundColor: formData.type === type.value ? theme.accent.primary : theme.background.secondary },
              ]}
              onPress={() => setFormData({ ...formData, type: type.value })}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: formData.type === type.value ? '#FFF' : theme.text.primary },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Business Stage *</Text>
        {businessStages.map((stage) => (
          <TouchableOpacity
            key={stage.value}
            style={[
              styles.stageOption,
              { backgroundColor: formData.stage === stage.value ? theme.accent.primary + '20' : theme.background.secondary },
            ]}
            onPress={() => setFormData({ ...formData, stage: stage.value })}
          >
            <View>
              <Text
                style={[
                  styles.stageLabel,
                  { color: formData.stage === stage.value ? theme.accent.primary : theme.text.primary },
                ]}
              >
                {stage.label}
              </Text>
              <Text style={[styles.stageDesc, { color: theme.text.secondary }]}>{stage.desc}</Text>
            </View>
            {formData.stage === stage.value && (
              <View style={[styles.checkCircle, { backgroundColor: theme.accent.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.background.secondary }]} onPress={() => setStep(1)}>
          <Text style={[styles.backButtonText, { color: theme.text.primary }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: theme.accent.primary }]} onPress={() => setStep(3)}>
          <Text style={styles.nextButtonText}>Continue</Text>
          <ChevronRight size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <DollarSign size={48} color={theme.accent.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text.primary }]}>Financial setup</Text>
      <Text style={[styles.stepDesc, { color: theme.text.secondary }]}>
        This helps us track your progress
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Starting Capital *</Text>
        <View style={styles.currencyRow}>
          <TouchableOpacity
            style={[
              styles.currencyButton,
              { backgroundColor: formData.currency === 'USD' ? theme.accent.primary : theme.background.secondary },
            ]}
            onPress={() => setFormData({ ...formData, currency: 'USD' })}
          >
            <Text
              style={[
                styles.currencyButtonText,
                { color: formData.currency === 'USD' ? '#FFF' : theme.text.primary },
              ]}
            >
              USD
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.currencyButton,
              { backgroundColor: formData.currency === 'ZWL' ? theme.accent.primary : theme.background.secondary },
            ]}
            onPress={() => setFormData({ ...formData, currency: 'ZWL' })}
          >
            <Text
              style={[
                styles.currencyButtonText,
                { color: formData.currency === 'ZWL' ? '#FFF' : theme.text.primary },
              ]}
            >
              ZWL
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
          placeholder="0.00"
          placeholderTextColor={theme.text.tertiary}
          keyboardType="decimal-pad"
          value={formData.capital}
          onChangeText={(text) => setFormData({ ...formData, capital: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Location *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
          placeholder="e.g. Harare, CBD"
          placeholderTextColor={theme.text.tertiary}
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.background.secondary }]} onPress={() => setStep(2)}>
          <Text style={[styles.backButtonText, { color: theme.text.primary }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: theme.accent.primary }]} onPress={() => setStep(4)}>
          <Text style={styles.nextButtonText}>Continue</Text>
          <ChevronRight size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.iconContainer, { backgroundColor: theme.accent.primary + '20' }]}>
        <Building2 size={48} color={theme.accent.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text.primary }]}>Which DreamBig book do you have?</Text>
      <Text style={[styles.stepDesc, { color: theme.text.secondary }]}>
        Your book unlocks specialized tools and guidance
      </Text>

      <ScrollView style={styles.booksContainer} showsVerticalScrollIndicator={false}>
        {DREAMBIG_BOOKS.map((book) => {
          const isSelected = formData.dreamBigBook === book.id;
          return (
            <TouchableOpacity
              key={book.id}
              style={[
                styles.bookCard,
                { 
                  backgroundColor: isSelected ? theme.accent.primary + '10' : theme.background.secondary,
                  borderColor: isSelected ? book.color : theme.border.light,
                },
              ]}
              onPress={() => setFormData({ ...formData, dreamBigBook: book.id })}
            >
              <View style={styles.bookHeader}>
                <View>
                  <Text style={[styles.bookTitle, { color: book.color }]}>{book.title}</Text>
                  <Text style={[styles.bookSubtitle, { color: theme.text.secondary }]}>{book.subtitle}</Text>
                </View>
                {isSelected && (
                  <View style={[styles.bookCheckCircle, { backgroundColor: book.color }]} />
                )}
              </View>
              <Text style={[styles.bookDescription, { color: theme.text.secondary }]}>{book.description}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.background.secondary }]} onPress={() => setStep(3)}>
          <Text style={[styles.backButtonText, { color: theme.text.primary }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: theme.accent.primary }]} 
          onPress={handleCreateBusiness}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>Create Business</Text>
              <ChevronRight size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <PageHeader
          title="My Businesses"
          subtitle="Manage multiple businesses from one account"
          icon={Building2}
          iconGradient={['#3B82F6', '#2563EB']}
          rightAction={
            <TouchableOpacity
              style={styles.headerAddButton}
              onPress={handleAddBusiness}
            >
              <Plus size={20} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          }
        />

        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          flex: 1,
        }}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent.primary} />
            </View>
          ) : businesses.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={48} color={theme.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                No businesses yet
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleAddBusiness}
              >
                <Text style={styles.emptyButtonText}>Add Your First Business</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView 
              style={styles.scrollView} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {limitInfo && (
                <View style={[styles.limitInfo, { backgroundColor: theme.background.card }]}>
                  <Text style={[styles.limitText, { color: theme.text.secondary }]}>
                    {limitInfo.currentCount} / {limitInfo.maxBusinesses === -1 ? '∞' : limitInfo.maxBusinesses} businesses ({limitInfo.planName || 'Free'})
                  </Text>
                </View>
              )}
              {businesses.map((businessItem) => {
                const isActive = currentBusiness?.id === businessItem.id;
                return (
                  <TouchableOpacity
                    key={businessItem.id}
                    style={[
                      styles.businessCard,
                      { backgroundColor: theme.background.card },
                      isActive && { borderWidth: 2, borderColor: theme.accent.primary },
                    ]}
                    onPress={() => handleSwitchBusiness(businessItem.id)}
                  >
                    <View style={styles.businessHeader}>
                      <View style={styles.businessInfo}>
                        <View style={styles.businessTitleRow}>
                          <Text style={[styles.businessName, { color: theme.text.primary }]}>
                            {businessItem.name}
                          </Text>
                          {isActive && (
                            <View style={[styles.activeBadge, { backgroundColor: theme.accent.primary }]}>
                              <CheckCircle size={12} color="#FFF" />
                              <Text style={styles.activeText}>Active</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.businessType, { color: theme.text.secondary }]}>
                          {getTypeLabel(businessItem.type)} • {getStageLabel(businessItem.stage)}
                        </Text>
                        <Text style={[styles.businessCurrency, { color: theme.text.tertiary }]}>
                          Currency: {businessItem.currency}
                        </Text>
                      </View>
                      <View style={styles.businessActions}>
                        {!isActive && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleSwitchBusiness(businessItem.id)}
                          >
                            <ArrowRight size={18} color={theme.accent.primary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteBusiness(businessItem.id)}
                        >
                          <Trash2 size={18} color={theme.accent.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>

        {/* Add Business Modal - Step by Step Onboarding */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                  {step === 1 && 'Business Details'}
                  {step === 2 && 'Business Type'}
                  {step === 3 && 'Financial Setup'}
                  {step === 4 && 'DreamBig Book'}
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <X size={24} color={theme.text.tertiary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Premium Upgrade Modal */}
        <PremiumUpgradeModal
          visible={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title="Business Limit Reached"
          message={`Your ${limitInfo?.planName || 'current plan'} allows ${limitInfo?.maxBusinesses} business${limitInfo?.maxBusinesses !== 1 ? 'es' : ''}. Upgrade to create more businesses and unlock unlimited potential!`}
          feature="Multiple Businesses"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  limitText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  businessCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  businessInfo: {
    flex: 1,
  },
  businessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  businessType: {
    fontSize: 14,
    marginBottom: 4,
  },
  businessCurrency: {
    fontSize: 12,
  },
  businessActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
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
  modalBody: {
    padding: 20,
    maxHeight: 600,
  },
  stepContainer: {
    paddingBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  chipScroll: {
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stageDesc: {
    fontSize: 12,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  currencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  booksContainer: {
    maxHeight: 300,
  },
  bookCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  bookSubtitle: {
    fontSize: 12,
  },
  bookCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  bookDescription: {
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
