import { Stack } from 'expo-router';
import { 
  Plus, 
  Building2,
  CheckCircle,
  Trash2,
  ArrowRight,
  X
} from 'lucide-react-native';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { BusinessType, BusinessStage, Currency } from '@/types/business';

interface BusinessListItem {
  id: string;
  name: string;
  type: BusinessType;
  stage: BusinessStage;
  currency: Currency;
  isActive: boolean;
}

export default function BusinessesScreen() {
  const { business } = useBusiness();
  const { theme } = useTheme();
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([
    // Current business is always first
    business ? {
      id: business.id,
      name: business.name,
      type: business.type,
      stage: business.stage,
      currency: business.currency,
      isActive: true,
    } : null,
  ].filter(Boolean) as BusinessListItem[]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('other');
  const [stage, setStage] = useState<BusinessStage>('idea');
  const [currency, setCurrency] = useState<Currency>('USD');

  const businessTypes: BusinessType[] = ['retail', 'services', 'manufacturing', 'agriculture', 'restaurant', 'salon', 'construction', 'transport', 'other'];
  const businessStages: BusinessStage[] = ['idea', 'running', 'growing'];
  const currencies: Currency[] = ['USD', 'ZWL'];

  const handleAddBusiness = () => {
    if (!name.trim()) {
      RNAlert.alert('Missing Name', 'Please enter a business name');
      return;
    }

    const newBusiness: BusinessListItem = {
      id: Date.now().toString(),
      name: name.trim(),
      type,
      stage,
      currency,
      isActive: false,
    };

    setBusinesses([...businesses, newBusiness]);
    handleCloseModal();
    RNAlert.alert('Success', 'Business added. Switch to it from the list.');
  };

  const handleSwitchBusiness = (businessId: string) => {
    setBusinesses(businesses.map(b => ({
      ...b,
      isActive: b.id === businessId,
    })));
    RNAlert.alert(
      'Switch Business',
      'To fully switch businesses, you would need to reload data. This feature requires backend support for multiple businesses per user.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteBusiness = (businessId: string) => {
    if (businesses.find(b => b.id === businessId)?.isActive) {
      RNAlert.alert('Cannot Delete', 'Cannot delete the currently active business');
      return;
    }

    RNAlert.alert(
      'Delete Business',
      'Are you sure you want to delete this business? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setBusinesses(businesses.filter(b => b.id !== businessId));
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setName('');
    setType('other');
    setStage('idea');
    setCurrency('USD');
  };

  const getTypeLabel = (type: BusinessType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getStageLabel = (stage: BusinessStage) => {
    switch (stage) {
      case 'idea':
        return 'Idea Stage';
      case 'running':
        return 'Running';
      case 'growing':
        return 'Growing';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'My Businesses', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>My Businesses</Text>
          <Text style={[styles.headerSubtitle, { color: theme.text.tertiary }]}>
            Manage multiple businesses from one account
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {businesses.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              No businesses yet
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add Your First Business</Text>
            </TouchableOpacity>
          </View>
        ) : (
          businesses.map(businessItem => (
            <TouchableOpacity
              key={businessItem.id}
              style={[
                styles.businessCard,
                { backgroundColor: theme.background.card },
                businessItem.isActive && { borderWidth: 2, borderColor: theme.accent.primary },
              ]}
              onPress={() => handleSwitchBusiness(businessItem.id)}
            >
              <View style={styles.businessHeader}>
                <View style={styles.businessInfo}>
                  <View style={styles.businessTitleRow}>
                    <Text style={[styles.businessName, { color: theme.text.primary }]}>
                      {businessItem.name}
                    </Text>
                    {businessItem.isActive && (
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
                  {!businessItem.isActive && (
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
          ))
        )}
      </ScrollView>

      {/* Add Business Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Add Business</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Business Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter business name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Business Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                  {businessTypes.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeOption,
                        { backgroundColor: type === t ? theme.accent.primary : theme.background.secondary },
                      ]}
                      onPress={() => setType(t)}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        { color: type === t ? '#FFF' : theme.text.primary },
                      ]}>
                        {getTypeLabel(t)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Business Stage</Text>
                <View style={styles.stageSelector}>
                  {businessStages.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.stageOption,
                        { backgroundColor: stage === s ? theme.accent.primary : theme.background.secondary },
                      ]}
                      onPress={() => setStage(s)}
                    >
                      <Text style={[
                        styles.stageOptionText,
                        { color: stage === s ? '#FFF' : theme.text.primary },
                      ]}>
                        {getStageLabel(s)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Currency</Text>
                <View style={styles.currencySelector}>
                  {currencies.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.currencyOption,
                        { backgroundColor: currency === c ? theme.accent.primary : theme.background.secondary },
                      ]}
                      onPress={() => setCurrency(c)}
                    >
                      <Text style={[
                        styles.currencyOptionText,
                        { color: currency === c ? '#FFF' : theme.text.primary },
                      ]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.buttonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleAddBusiness}
              >
                <Text style={styles.saveButtonText}>Add Business</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
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
  },
  inputGroup: {
    marginBottom: 16,
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
  typeSelector: {
    marginTop: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stageSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stageOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stageOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  currencyOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    // Styled via backgroundColor
  },
  saveButton: {
    // Styled via backgroundColor
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

