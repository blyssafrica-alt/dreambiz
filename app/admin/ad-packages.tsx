import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, X, Save, Trash2 } from 'lucide-react-native';
import type { AdPackage } from '@/types/super-admin';

export default function AdPackagesScreen() {
  const { theme } = useTheme();
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<AdPackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    pricePerLocation: '1',
    durationDays: '7',
    displayOrder: '0',
    isActive: true,
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ad_packages')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      if (data) {
        setPackages(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description || '',
          price: parseFloat(row.price),
          currency: row.currency,
          pricePerLocation: row.price_per_location ? parseFloat(row.price_per_location) : 1,
          durationDays: row.duration_days,
          isActive: row.is_active,
          displayOrder: row.display_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      } else {
        setPackages([]);
      }
    } catch (error) {
      console.error('Failed to load ad packages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (pkg?: AdPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        price: String(pkg.price),
        currency: pkg.currency || 'USD',
        pricePerLocation: String(pkg.pricePerLocation ?? 1),
        durationDays: String(pkg.durationDays),
        displayOrder: String(pkg.displayOrder ?? 0),
        isActive: pkg.isActive,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        currency: 'USD',
        pricePerLocation: '1',
        durationDays: '7',
        displayOrder: '0',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      Alert.alert('Error', 'Please fill in name and price');
      return;
    }
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        currency: formData.currency || 'USD',
        price_per_location: parseFloat(formData.pricePerLocation) || 1,
        duration_days: parseInt(formData.durationDays, 10) || 7,
        display_order: parseInt(formData.displayOrder, 10) || 0,
        is_active: formData.isActive,
      };

      if (editingPackage) {
        const { error } = await supabase.from('ad_packages').update(payload).eq('id', editingPackage.id);
        if (error) throw error;
        Alert.alert('Success', 'Package updated');
      } else {
        const { error } = await supabase.from('ad_packages').insert(payload);
        if (error) throw error;
        Alert.alert('Success', 'Package created');
      }
      setShowModal(false);
      loadPackages();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save package');
    }
  };

  const handleDelete = async (pkgId: string) => {
    Alert.alert('Delete Package', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('ad_packages').delete().eq('id', pkgId);
            if (error) throw error;
            Alert.alert('Deleted', 'Package removed');
            loadPackages();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete package');
          }
        },
      },
    ]);
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Ad Packages</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.accent.primary} />
        ) : packages.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No packages yet</Text>
        ) : (
          packages.map(pkg => (
            <View key={pkg.id} style={[styles.card, { backgroundColor: theme.background.card }]}>
              <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{pkg.name}</Text>
              {pkg.description && (
                <Text style={[styles.cardText, { color: theme.text.secondary }]}>{pkg.description}</Text>
              )}
              <Text style={[styles.cardText, { color: theme.text.secondary }]}>
                {pkg.currency} {pkg.price.toFixed(2)} · {pkg.durationDays} days · x{pkg.pricePerLocation} / location
              </Text>
              <Text style={[styles.cardText, { color: theme.text.tertiary }]}>
                Status: {pkg.isActive ? 'Active' : 'Inactive'}
              </Text>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleOpenModal(pkg)} style={styles.actionButton}>
                  <Edit size={18} color={theme.accent.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(pkg.id)} style={styles.actionButton}>
                  <Trash2 size={18} color={theme.accent.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingPackage ? 'Edit Package' : 'New Package'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Price</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Currency</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.currency}
                onChangeText={(text) => setFormData({ ...formData, currency: text.toUpperCase().slice(0, 3) })}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Price Per Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.pricePerLocation}
                onChangeText={(text) => setFormData({ ...formData, pricePerLocation: text.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Duration (days)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.durationDays}
                onChangeText={(text) => setFormData({ ...formData, durationDays: text.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Display Order</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.displayOrder}
                onChangeText={(text) => setFormData({ ...formData, displayOrder: text.replace(/[^0-9]/g, '') })}
                keyboardType="number-pad"
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]} onPress={() => setShowModal(false)}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 40 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardText: { fontSize: 13, marginBottom: 4 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionButton: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16 },
  modalBodyContent: { paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: { padding: 12, borderRadius: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  cancelButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '600' },
  saveButton: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10 },
  saveButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

