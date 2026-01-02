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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, Trash2, X, Save, HelpCircle, Mail, MessageCircle, Book, Lightbulb } from 'lucide-react-native';

interface HelpContentItem {
  id: string;
  contentType: 'faq' | 'support_option' | 'quick_tip';
  // FAQ fields
  faqId?: string;
  faqQuestion?: string;
  faqAnswer?: string;
  // Support option fields
  supportId?: string;
  supportTitle?: string;
  supportDescription?: string;
  supportIcon?: string;
  supportActionType?: 'email' | 'url' | 'whatsapp' | 'internal';
  supportActionValue?: string;
  // Quick tip fields
  tipText?: string;
  // Common fields
  displayOrder: number;
  isActive: boolean;
}

export default function HelpContentManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<HelpContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'faq' | 'support_option' | 'quick_tip'>('faq');
  const [formData, setFormData] = useState<Partial<HelpContentItem>>({
    contentType: 'faq',
    displayOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('help_content')
        .select('*')
        .order('content_type', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setItems(data.map((row: any) => ({
          id: row.id,
          contentType: row.content_type,
          faqId: row.faq_id,
          faqQuestion: row.faq_question,
          faqAnswer: row.faq_answer,
          supportId: row.support_id,
          supportTitle: row.support_title,
          supportDescription: row.support_description,
          supportIcon: row.support_icon,
          supportActionType: row.support_action_type,
          supportActionValue: row.support_action_value,
          tipText: row.tip_text,
          displayOrder: row.display_order || 0,
          isActive: row.is_active !== false,
        })));
      }
    } catch (error: any) {
      console.error('Failed to load help content:', error);
      Alert.alert('Error', error.message || 'Failed to load help content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const data: any = {
        content_type: contentType,
        display_order: formData.displayOrder || 0,
        is_active: formData.isActive !== false,
      };

      if (contentType === 'faq') {
        if (!formData.faqQuestion || !formData.faqAnswer) {
          Alert.alert('Missing Fields', 'Please fill in question and answer');
          return;
        }
        data.faq_id = formData.faqId || `faq-${Date.now()}`;
        data.faq_question = formData.faqQuestion;
        data.faq_answer = formData.faqAnswer;
      } else if (contentType === 'support_option') {
        if (!formData.supportTitle || !formData.supportDescription) {
          Alert.alert('Missing Fields', 'Please fill in title and description');
          return;
        }
        data.support_id = formData.supportId || `support-${Date.now()}`;
        data.support_title = formData.supportTitle;
        data.support_description = formData.supportDescription;
        data.support_icon = formData.supportIcon || 'HelpCircle';
        data.support_action_type = formData.supportActionType || 'url';
        data.support_action_value = formData.supportActionValue || '';
      } else if (contentType === 'quick_tip') {
        if (!formData.tipText) {
          Alert.alert('Missing Fields', 'Please fill in tip text');
          return;
        }
        data.tip_text = formData.tipText;
      }

      if (editingId) {
        const { error } = await supabase
          .from('help_content')
          .update(data)
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Success', 'Content updated successfully');
      } else {
        const { error } = await supabase
          .from('help_content')
          .insert(data);

        if (error) throw error;
        Alert.alert('Success', 'Content created successfully');
      }

      handleCloseModal();
      loadContent();
    } catch (error: any) {
      console.error('Failed to save help content:', error);
      Alert.alert('Error', error.message || 'Failed to save help content');
    }
  };

  const handleEdit = (item: HelpContentItem) => {
    setEditingId(item.id);
    setContentType(item.contentType);
    setFormData({
      contentType: item.contentType,
      faqId: item.faqId,
      faqQuestion: item.faqQuestion,
      faqAnswer: item.faqAnswer,
      supportId: item.supportId,
      supportTitle: item.supportTitle,
      supportDescription: item.supportDescription,
      supportIcon: item.supportIcon,
      supportActionType: item.supportActionType,
      supportActionValue: item.supportActionValue,
      tipText: item.tipText,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Content',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('help_content')
                .delete()
                .eq('id', id);

              if (error) throw error;
              loadContent();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete content');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setContentType('faq');
    setFormData({
      contentType: 'faq',
      displayOrder: 0,
      isActive: true,
    });
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'faq': return HelpCircle;
      case 'support_option': return Mail;
      case 'quick_tip': return Lightbulb;
      default: return HelpCircle;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'faq': return 'FAQ';
      case 'support_option': return 'Support';
      case 'quick_tip': return 'Tip';
      default: return type;
    }
  };

  const faqItems = items.filter(i => i.contentType === 'faq');
  const supportItems = items.filter(i => i.contentType === 'support_option');
  const tipItems = items.filter(i => i.contentType === 'quick_tip');

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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Manage Help Content</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => {
            setContentType('faq');
            setFormData({ contentType: 'faq', displayOrder: 0, isActive: true });
            setShowModal(true);
          }}
        >
          <Plus size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* FAQs Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>FAQs ({faqItems.length})</Text>
          {faqItems.map(item => {
            const Icon = getContentTypeIcon(item.contentType);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, { backgroundColor: theme.background.card }]}
                onPress={() => handleEdit(item)}
              >
                <View style={styles.itemHeader}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.accent.primary + '20' }]}>
                    <Icon size={20} color={theme.accent.primary} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemTitle, { color: theme.text.primary }]} numberOfLines={1}>
                      {item.faqQuestion || 'Untitled FAQ'}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: theme.text.secondary }]} numberOfLines={1}>
                      {item.faqAnswer || 'No answer'}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleEdit(item)}
                  >
                    <Edit size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Support Options Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Support Options ({supportItems.length})</Text>
          {supportItems.map(item => {
            const Icon = getContentTypeIcon(item.contentType);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, { backgroundColor: theme.background.card }]}
                onPress={() => handleEdit(item)}
              >
                <View style={styles.itemHeader}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.accent.primary + '20' }]}>
                    <Icon size={20} color={theme.accent.primary} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemTitle, { color: theme.text.primary }]} numberOfLines={1}>
                      {item.supportTitle || 'Untitled Support'}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: theme.text.secondary }]} numberOfLines={1}>
                      {item.supportDescription || 'No description'}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleEdit(item)}
                  >
                    <Edit size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Tips Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Quick Tips ({tipItems.length})</Text>
          {tipItems.map(item => {
            const Icon = getContentTypeIcon(item.contentType);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, { backgroundColor: theme.background.card }]}
                onPress={() => handleEdit(item)}
              >
                <View style={styles.itemHeader}>
                  <View style={[styles.itemIcon, { backgroundColor: theme.accent.primary + '20' }]}>
                    <Icon size={20} color={theme.accent.primary} />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemTitle, { color: theme.text.primary }]} numberOfLines={2}>
                      {item.tipText || 'Untitled Tip'}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleEdit(item)}
                  >
                    <Edit size={18} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingId ? 'Edit Content' : 'Add New Content'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {/* Content Type Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Content Type</Text>
                <View style={styles.typeOptions}>
                  {(['faq', 'support_option', 'quick_tip'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor: contentType === type ? theme.accent.primary : theme.background.secondary,
                          borderColor: contentType === type ? theme.accent.primary : theme.border.light,
                        }
                      ]}
                      onPress={() => {
                        setContentType(type);
                        setFormData({ ...formData, contentType: type });
                      }}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        { color: contentType === type ? '#FFF' : theme.text.primary }
                      ]}>
                        {getContentTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* FAQ Fields */}
              {contentType === 'faq' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>FAQ ID</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.faqId}
                      onChangeText={(text) => setFormData({ ...formData, faqId: text })}
                      placeholder="e.g., getting-started"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Question *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.faqQuestion}
                      onChangeText={(text) => setFormData({ ...formData, faqQuestion: text })}
                      placeholder="Enter question"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Answer *</Text>
                    <TextInput
                      style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.faqAnswer}
                      onChangeText={(text) => setFormData({ ...formData, faqAnswer: text })}
                      placeholder="Enter answer"
                      placeholderTextColor={theme.text.tertiary}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </>
              )}

              {/* Support Option Fields */}
              {contentType === 'support_option' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Support ID</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.supportId}
                      onChangeText={(text) => setFormData({ ...formData, supportId: text })}
                      placeholder="e.g., email, whatsapp"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Title *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.supportTitle}
                      onChangeText={(text) => setFormData({ ...formData, supportTitle: text })}
                      placeholder="Enter title"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Description *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.supportDescription}
                      onChangeText={(text) => setFormData({ ...formData, supportDescription: text })}
                      placeholder="Enter description"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Icon Name</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.supportIcon}
                      onChangeText={(text) => setFormData({ ...formData, supportIcon: text })}
                      placeholder="e.g., Mail, MessageCircle, Book"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Action Type</Text>
                    <View style={styles.typeOptions}>
                      {(['email', 'url', 'whatsapp', 'internal'] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeOption,
                            {
                              backgroundColor: formData.supportActionType === type ? theme.accent.primary : theme.background.secondary,
                              borderColor: formData.supportActionType === type ? theme.accent.primary : theme.border.light,
                            }
                          ]}
                          onPress={() => setFormData({ ...formData, supportActionType: type })}
                        >
                          <Text style={[
                            styles.typeOptionText,
                            { color: formData.supportActionType === type ? '#FFF' : theme.text.primary }
                          ]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Action Value</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={formData.supportActionValue}
                      onChangeText={(text) => setFormData({ ...formData, supportActionValue: text })}
                      placeholder="Email, URL, or internal route"
                      placeholderTextColor={theme.text.tertiary}
                    />
                  </View>
                </>
              )}

              {/* Quick Tip Fields */}
              {contentType === 'quick_tip' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Tip Text *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={formData.tipText}
                    onChangeText={(text) => setFormData({ ...formData, tipText: text })}
                    placeholder="Enter tip text"
                    placeholderTextColor={theme.text.tertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Common Fields */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Display Order</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={formData.displayOrder?.toString()}
                  onChangeText={(text) => setFormData({ ...formData, displayOrder: parseInt(text) || 0 })}
                  placeholder="0"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Active</Text>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: formData.isActive !== false ? theme.accent.primary : theme.background.secondary,
                      borderColor: formData.isActive !== false ? theme.accent.primary : theme.border.light,
                    }
                  ]}
                  onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
                >
                  {formData.isActive !== false && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border.light }]}>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.footerButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
              >
                <Save size={18} color="#FFF" />
                <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Save</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    flex: 1,
  },
  modalBodyContent: {
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  typeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

