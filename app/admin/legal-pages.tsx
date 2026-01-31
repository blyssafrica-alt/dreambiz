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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, X, Save, Trash2, Edit } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
}

export default function LegalPagesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<LegalPage | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    isActive: true,
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPages((data || []) as LegalPage[]);
    } catch (error) {
      console.error('Failed to load legal pages:', error);
      Alert.alert('Error', 'Failed to load legal pages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (page?: LegalPage) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        slug: page.slug,
        title: page.title,
        content: page.content,
        isActive: page.is_active,
      });
    } else {
      setEditingPage(null);
      setFormData({
        slug: '',
        title: '',
        content: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.slug.trim() || !formData.title.trim()) {
      Alert.alert('Missing Fields', 'Slug and title are required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const payload = {
        slug: formData.slug.trim(),
        title: formData.title.trim(),
        content: formData.content.trim(),
        is_active: formData.isActive,
        updated_by: user.id,
        ...(editingPage ? {} : { created_by: user.id }),
      };

      if (editingPage) {
        const { error } = await supabase
          .from('legal_pages')
          .update(payload)
          .eq('id', editingPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('legal_pages').insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      loadPages();
      Alert.alert('Success', 'Legal page saved');
    } catch (error: any) {
      console.error('Failed to save legal page:', error);
      Alert.alert('Error', error.message || 'Failed to save legal page');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Page', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('legal_pages').delete().eq('id', id);
            if (error) throw error;
            loadPages();
          } catch (error) {
            console.error('Failed to delete legal page:', error);
            Alert.alert('Error', 'Failed to delete legal page');
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Legal Pages</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {pages.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
            No legal pages yet.
          </Text>
        ) : (
          pages.map(page => (
            <View key={page.id} style={[styles.pageCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.pageHeader}>
                <View style={styles.pageInfo}>
                  <Text style={[styles.pageTitle, { color: theme.text.primary }]}>{page.title}</Text>
                  <Text style={[styles.pageSlug, { color: theme.text.tertiary }]}>/{page.slug}</Text>
                </View>
                <View style={styles.pageActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                    onPress={() => handleOpenModal(page)}
                  >
                    <Edit size={16} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                    onPress={() => handleDelete(page.id)}
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
                {editingPage ? 'Edit Page' : 'New Page'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Slug *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.slug}
                onChangeText={(text) => setFormData({ ...formData, slug: text })}
                placeholder="terms"
                placeholderTextColor={theme.text.tertiary}
                autoCapitalize="none"
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Terms & Conditions"
                placeholderTextColor={theme.text.tertiary}
              />
              <Text style={[styles.label, { color: theme.text.secondary }]}>Content</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
                placeholder="Write the legal content here..."
                placeholderTextColor={theme.text.tertiary}
                multiline
              />
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
  emptyText: { textAlign: 'center', marginTop: 24 },
  pageCard: { padding: 14, borderRadius: 12 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  pageInfo: { flex: 1 },
  pageTitle: { fontSize: 16, fontWeight: '700' },
  pageSlug: { fontSize: 12, marginTop: 2 },
  pageActions: { flexDirection: 'row', gap: 8 },
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
  textArea: { borderRadius: 10, padding: 10, fontSize: 14, minHeight: 160, textAlignVertical: 'top' },
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

