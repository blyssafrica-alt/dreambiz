import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, CreditCard, X, Save, Edit, Trash2 } from 'lucide-react-native';

interface PaymentMethod {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  type: 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'crypto' | 'other';
  is_active: boolean;
  requires_setup: boolean;
  setup_instructions?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function PaymentMethodsManagementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    icon: '',
    type: 'other' as PaymentMethod['type'],
    isActive: true,
    requiresSetup: false,
    setupInstructions: '',
    displayOrder: '0',
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setPaymentMethods(data);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        displayName: method.display_name,
        description: method.description || '',
        icon: method.icon || '',
        type: method.type,
        isActive: method.is_active,
        requiresSetup: method.requires_setup,
        setupInstructions: method.setup_instructions || '',
        displayOrder: method.display_order.toString(),
      });
    } else {
      setEditingMethod(null);
      setFormData({
        name: '',
        displayName: '',
        description: '',
        icon: '',
        type: 'other',
        isActive: true,
        requiresSetup: false,
        setupInstructions: '',
        displayOrder: '0',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.displayName) {
      Alert.alert('Error', 'Please fill in name and display name');
      return;
    }

    try {
      const methodData: any = {
        name: formData.name,
        display_name: formData.displayName,
        description: formData.description || null,
        icon: formData.icon || null,
        type: formData.type,
        is_active: formData.isActive,
        requires_setup: formData.requiresSetup,
        setup_instructions: formData.setupInstructions || null,
        display_order: parseInt(formData.displayOrder),
        created_by: user?.id,
      };

      if (editingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update(methodData)
          .eq('id', editingMethod.id);

        if (error) throw error;
        Alert.alert('Success', 'Payment method updated successfully');
      } else {
        const { error } = await supabase.from('payment_methods').insert(methodData);

        if (error) throw error;
        Alert.alert('Success', 'Payment method created successfully');
      }

      setShowModal(false);
      loadPaymentMethods();
    } catch (error) {
      console.error('Failed to save payment method:', error);
      Alert.alert('Error', 'Failed to save payment method');
    }
  };

  const handleDelete = async (methodId: string) => {
    Alert.alert('Delete Payment Method', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('payment_methods').delete().eq('id', methodId);
            if (error) throw error;
            Alert.alert('Success', 'Payment method deleted');
            loadPaymentMethods();
          } catch (error) {
            console.error('Failed to delete payment method:', error);
            Alert.alert('Error', 'Failed to delete payment method');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Payment Methods</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No payment methods yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>Create your first payment method</Text>
          </View>
        ) : (
          paymentMethods.map((method) => (
            <View key={method.id} style={[styles.methodCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.methodHeader}>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodName, { color: theme.text.primary }]}>{method.display_name}</Text>
                  <Text style={[styles.methodType, { color: theme.text.secondary }]}>{method.type.replace('_', ' ')}</Text>
                  {method.description && (
                    <Text style={[styles.methodDesc, { color: theme.text.secondary }]}>{method.description}</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: method.is_active ? '#10B98120' : '#64748B20' }]}>
                  <Text style={[styles.badgeText, { color: method.is_active ? '#10B981' : '#64748B' }]}>
                    {method.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <View style={styles.methodActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                  onPress={() => handleOpenModal(method)}
                >
                  <Edit size={18} color={theme.accent.info} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                  onPress={() => handleDelete(method.id)}
                >
                  <Trash2 size={18} color={theme.accent.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Payment Method Form Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingMethod ? 'Edit Payment Method' : 'Create Payment Method'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name (internal) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="e.g., cash, card, mobile_money"
                placeholderTextColor={theme.text.tertiary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Display Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="e.g., Cash, Credit Card, Mobile Money"
                placeholderTextColor={theme.text.tertiary}
                value={formData.displayName}
                onChangeText={(text) => setFormData({ ...formData, displayName: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Description"
                placeholderTextColor={theme.text.tertiary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Icon (emoji or name)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="💵 or icon-name"
                placeholderTextColor={theme.text.tertiary}
                value={formData.icon}
                onChangeText={(text) => setFormData({ ...formData, icon: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Type</Text>
              <View style={styles.typeButtons}>
                {(['cash', 'card', 'bank_transfer', 'mobile_money', 'crypto', 'other'] as PaymentMethod['type'][]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, { backgroundColor: formData.type === type ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.type === type ? '#FFF' : theme.text.primary }]}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Display Order</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="0"
                placeholderTextColor={theme.text.tertiary}
                value={formData.displayOrder}
                onChangeText={(text) => setFormData({ ...formData, displayOrder: text })}
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Requires Setup</Text>
                <Switch
                  value={formData.requiresSetup}
                  onValueChange={(value) => setFormData({ ...formData, requiresSetup: value })}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>

              {formData.requiresSetup && (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Setup Instructions</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="Instructions for setting up this payment method"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.setupInstructions}
                    onChangeText={(text) => setFormData({ ...formData, setupInstructions: text })}
                    multiline
                    numberOfLines={4}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent.primary }]} onPress={handleSave}>
                <Save size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  methodCard: { padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  methodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  methodInfo: { flex: 1, marginRight: 12 },
  methodName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  methodType: { fontSize: 14, textTransform: 'capitalize', marginBottom: 4 },
  methodDesc: { fontSize: 13 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  methodActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { padding: 20, maxHeight: 500 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 4 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  typeButtons: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  typeButtonText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancelButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

