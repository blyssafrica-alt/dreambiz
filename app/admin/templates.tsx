import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, FileText, Edit, X, Save, Trash2 } from 'lucide-react-native';
import type { DocumentTemplate } from '@/types/super-admin';

export default function TemplatesManagementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    documentType: 'invoice',
    businessType: '',
    requiredFields: [] as string[],
    numberingRule: 'INV-{YYYY}-{####}',
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('document_type', { ascending: true });

      if (error) throw error;

      if (data) {
        setTemplates(
          data.map((row: any) => ({
            id: row.id,
            name: row.name,
            documentType: row.document_type,
            businessType: row.business_type,
            templateData: row.template_data,
            requiredFields: row.required_fields || [],
            numberingRule: row.numbering_rule,
            isActive: row.is_active,
            version: row.version,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (template?: DocumentTemplate) => {
    if (template) {
      setEditingTemplate(template);
      // Convert numberingRule object to string format if needed
      const numberingRuleStr = typeof template.numberingRule === 'object' && template.numberingRule?.format
        ? template.numberingRule.format
        : (typeof template.numberingRule === 'string' ? template.numberingRule : 'INV-{YYYY}-{####}');
      
      setFormData({
        name: template.name,
        documentType: template.documentType,
        businessType: template.businessType || '',
        requiredFields: Array.isArray(template.requiredFields) ? template.requiredFields : [],
        numberingRule: numberingRuleStr,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        documentType: 'invoice',
        businessType: '',
        requiredFields: [],
        numberingRule: 'INV-{YYYY}-{####}',
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.documentType) {
      Alert.alert('Error', 'Please fill in name and document type');
      return;
    }

    try {
      // Convert numberingRule string to JSONB object
      const numberingRuleObj = typeof formData.numberingRule === 'string' 
        ? {
            prefix: formData.numberingRule.split('-')[0] || 'INV',
            format: formData.numberingRule,
            start: 1,
            padding: 4,
          }
        : formData.numberingRule;

      const templateData: any = {
        name: formData.name,
        document_type: formData.documentType,
        business_type: formData.businessType || null,
        required_fields: Array.isArray(formData.requiredFields) ? formData.requiredFields : [],
        numbering_rule: numberingRuleObj,
        template_data: {},
        is_active: true,
        version: editingTemplate ? editingTemplate.version + 1 : 1,
        created_by: user?.id,
      };

      if (editingTemplate) {
        const { error } = await supabase.from('document_templates').update(templateData).eq('id', editingTemplate.id);
        if (error) throw error;
        Alert.alert('Success', 'Template updated successfully');
      } else {
        const { error } = await supabase.from('document_templates').insert(templateData);
        if (error) throw error;
        Alert.alert('Success', 'Template created successfully');
      }

      setShowModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const handleDelete = async (templateId: string) => {
    Alert.alert('Delete Template', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('document_templates').delete().eq('id', templateId);
            if (error) throw error;
            Alert.alert('Success', 'Template deleted');
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Document Templates</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No templates yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>Create your first template to get started</Text>
          </View>
        ) : (
          templates.map((template) => (
            <View key={template.id} style={[styles.templateCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.templateHeader}>
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateName, { color: theme.text.primary }]}>{template.name}</Text>
                  <View style={styles.templateMeta}>
                    <View style={[styles.badge, { backgroundColor: theme.surface.info }]}>
                      <Text style={[styles.badgeText, { color: theme.accent.info }]}>{template.documentType.replace('_', ' ')}</Text>
                    </View>
                    {template.businessType && (
                      <View style={[styles.badge, { backgroundColor: theme.surface.success }]}>
                        <Text style={[styles.badgeText, { color: theme.accent.success }]}>{template.businessType}</Text>
                      </View>
                    )}
                    {template.isActive && (
                      <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>Active</Text>
                      </View>
                    )}
                    <Text style={[styles.version, { color: theme.text.secondary }]}>v{template.version}</Text>
                  </View>
                  {template.requiredFields.length > 0 && (
                    <Text style={[styles.requiredFields, { color: theme.text.secondary }]}>
                      Required: {template.requiredFields.join(', ')}
                    </Text>
                  )}
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                    onPress={() => handleOpenModal(template)}
                  >
                    <Edit size={18} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                    onPress={() => handleDelete(template.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Template Form Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>{editingTemplate ? 'Edit Template' : 'Create Template'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Template name"
                placeholderTextColor={theme.text.tertiary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Document Type *</Text>
              <View style={styles.typeButtons}>
                {['invoice', 'receipt', 'quotation', 'purchase_order', 'contract', 'supplier_agreement'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeButton, { backgroundColor: formData.documentType === type ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, documentType: type })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.documentType === type ? '#FFF' : theme.text.primary }]}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Business Type</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="e.g., retail, service, manufacturing"
                placeholderTextColor={theme.text.tertiary}
                value={formData.businessType}
                onChangeText={(text) => setFormData({ ...formData, businessType: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Numbering Rule</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="INV-{YYYY}-{####}"
                placeholderTextColor={theme.text.tertiary}
                value={formData.numberingRule}
                onChangeText={(text) => setFormData({ ...formData, numberingRule: text })}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 8 },
  templateCard: { padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  templateInfo: { flex: 1, marginRight: 12 },
  templateName: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  templateMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  version: { fontSize: 12, marginLeft: 'auto' },
  requiredFields: { fontSize: 12, marginTop: 4 },
  templateActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { padding: 20, maxHeight: 500 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  input: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 4 },
  typeButtons: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  typeButtonText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancelButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
