import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, X, Save, Trash2, Edit } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface BudgetTemplateRow {
  id: string;
  name: string;
  description?: string;
  business_types?: string[];
  categories?: { category: string; percentage?: number; description?: string }[];
  is_active: boolean;
  display_order: number;
}

export default function BudgetTemplatesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [templates, setTemplates] = useState<BudgetTemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BudgetTemplateRow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    businessTypes: '',
    categories: [{ category: '', percentage: '', description: '' }],
    isActive: true,
    displayOrder: '0',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('budget_templates')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as BudgetTemplateRow[]);
    } catch (error) {
      console.error('Failed to load budget templates:', error);
      Alert.alert('Error', 'Failed to load budget templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (template?: BudgetTemplateRow) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        businessTypes: (template.business_types || []).join(', '),
        categories: (template.categories && template.categories.length > 0)
          ? template.categories.map(cat => ({
              category: cat.category || '',
              percentage: String(cat.percentage ?? ''),
              description: cat.description || '',
            }))
          : [{ category: '', percentage: '', description: '' }],
        isActive: template.is_active,
        displayOrder: String(template.display_order ?? 0),
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        businessTypes: '',
        categories: [{ category: '', percentage: '', description: '' }],
        isActive: true,
        displayOrder: '0',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Missing Fields', 'Name is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const businessTypes = formData.businessTypes
        .split(',')
        .map(type => type.trim())
        .filter(Boolean);

      const categories = formData.categories
        .filter(cat => cat.category.trim())
        .map(cat => ({
          category: cat.category.trim(),
          percentage: Number(cat.percentage || 0),
          description: cat.description?.trim() || '',
        }));

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        business_types: businessTypes,
        categories,
        is_active: formData.isActive,
        display_order: parseInt(formData.displayOrder || '0', 10),
        updated_by: user.id,
        ...(editingTemplate ? {} : { created_by: user.id }),
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('budget_templates')
          .update(payload)
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('budget_templates').insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      loadTemplates();
      Alert.alert('Success', 'Template saved');
    } catch (error: any) {
      console.error('Failed to save template:', error);
      Alert.alert('Error', error.message || 'Failed to save template');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Template', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('budget_templates').delete().eq('id', id);
            if (error) throw error;
            loadTemplates();
          } catch (error) {
            console.error('Failed to delete template:', error);
            Alert.alert('Error', 'Failed to delete template');
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Budget Templates</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {templates.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
              No budget templates yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              Create templates for each business type so budgets can be started in seconds.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => handleOpenModal()}
            >
              <Plus size={16} color="#FFF" />
              <Text style={styles.primaryButtonText}>Create Template</Text>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map(template => (
            <View key={template.id} style={[styles.templateCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.templateHeader}>
                <View style={styles.templateInfo}>
                  <View style={styles.templateTitleRow}>
                    <Text style={[styles.templateName, { color: theme.text.primary }]}>{template.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: template.is_active ? '#10B98120' : '#64748B20' },
                      ]}
                    >
                      <Text style={[styles.statusBadgeText, { color: template.is_active ? '#10B981' : '#64748B' }]}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  {template.description ? (
                    <Text style={[styles.templateDesc, { color: theme.text.secondary }]}>{template.description}</Text>
                  ) : null}
                  {template.business_types && template.business_types.length > 0 && (
                    <View style={styles.chipRow}>
                      {template.business_types.map(type => (
                        <View key={type} style={[styles.chip, { backgroundColor: theme.background.secondary }]}>
                          <Text style={[styles.chipText, { color: theme.text.secondary }]}>{type}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <Text style={[styles.templateMeta, { color: theme.text.tertiary }]}>
                      {template.categories?.length || 0} categories
                    </Text>
                    <Text style={[styles.templateMeta, { color: theme.text.tertiary }]}>
                      Order {template.display_order ?? 0}
                    </Text>
                  </View>
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                    onPress={() => handleOpenModal(template)}
                  >
                    <Edit size={16} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                    onPress={() => handleDelete(template.id)}
                  >
                    <Trash2 size={16} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
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
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Template name"
                placeholderTextColor={theme.text.tertiary}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Short description"
                placeholderTextColor={theme.text.tertiary}
              />

              <View style={styles.rowBetween}>
                <View style={styles.flexOne}>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Display Order</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={formData.displayOrder}
                    onChangeText={(text) => setFormData({ ...formData, displayOrder: text })}
                    placeholder="0"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.switchWrap}>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Active</Text>
                  <Switch
                    value={formData.isActive}
                    onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                    trackColor={{ false: '#CBD5F5', true: theme.accent.primary }}
                    thumbColor="#FFF"
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Business Types</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.businessTypes}
                onChangeText={(text) => setFormData({ ...formData, businessTypes: text })}
                placeholder="retail, services, restaurant"
                placeholderTextColor={theme.text.tertiary}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Categories</Text>
              {formData.categories.map((cat, idx) => (
                <View key={idx} style={[styles.categoryCard, { backgroundColor: theme.background.secondary }]}>
                  <View style={styles.categoryRow}>
                    <TextInput
                      style={[styles.input, styles.categoryInput, { color: theme.text.primary }]}
                      value={cat.category}
                      onChangeText={(text) => {
                        const updated = [...formData.categories];
                        updated[idx].category = text;
                        setFormData({ ...formData, categories: updated });
                      }}
                      placeholder="Category"
                      placeholderTextColor={theme.text.tertiary}
                    />
                    <TextInput
                      style={[styles.input, styles.percentInput, { color: theme.text.primary }]}
                      value={cat.percentage}
                      onChangeText={(text) => {
                        const updated = [...formData.categories];
                        updated[idx].percentage = text;
                        setFormData({ ...formData, categories: updated });
                      }}
                      placeholder="%"
                      placeholderTextColor={theme.text.tertiary}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={styles.removeChip}
                      onPress={() => {
                        const updated = formData.categories.filter((_, i) => i !== idx);
                        setFormData({ ...formData, categories: updated.length ? updated : [{ category: '', percentage: '', description: '' }] });
                      }}
                    >
                      <X size={16} color={theme.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.input, styles.categoryDescInput, { color: theme.text.primary }]}
                    value={cat.description}
                    onChangeText={(text) => {
                      const updated = [...formData.categories];
                      updated[idx].description = text;
                      setFormData({ ...formData, categories: updated });
                    }}
                    placeholder="Short description (optional)"
                    placeholderTextColor={theme.text.tertiary}
                  />
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addCategoryButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => setFormData({ ...formData, categories: [...formData.categories, { category: '', percentage: '', description: '' }] })}
              >
                <Text style={[styles.addCategoryText, { color: theme.text.primary }]}>Add Category</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent.primary }]} onPress={handleSave}>
              <Save size={16} color="#FFF" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  contentContainer: { padding: 16, gap: 12 },
  emptyState: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { textAlign: 'center' },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '600' },
  templateCard: { padding: 14, borderRadius: 12 },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  templateInfo: { flex: 1 },
  templateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templateName: { fontSize: 16, fontWeight: '700' },
  templateDesc: { fontSize: 13, marginTop: 4 },
  templateMeta: { fontSize: 12, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  chipText: { fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  templateActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8, borderRadius: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalBody: { padding: 16 },
  modalBodyContent: { paddingBottom: 56 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { borderRadius: 10, padding: 10, fontSize: 14, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', gap: 12 },
  flexOne: { flex: 1 },
  switchWrap: { alignItems: 'flex-start', justifyContent: 'flex-end', paddingBottom: 6 },
  categoryRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  categoryInput: { flex: 1 },
  percentInput: { width: 70 },
  categoryCard: { padding: 10, borderRadius: 12, marginBottom: 8 },
  categoryDescInput: { marginTop: 6 },
  removeChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  addCategoryButton: { padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  addCategoryText: { fontSize: 13, fontWeight: '600' },
  saveButton: {
    margin: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: { color: '#FFF', fontWeight: '600' },
});

