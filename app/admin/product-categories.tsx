import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, Trash2, Folder, X, Save } from 'lucide-react-native';
import type { ProductCategory } from '@/types/super-admin';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { decode } from 'base64-arraybuffer';

export default function ProductCategoriesScreen() {
  const { theme } = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    displayOrder: '0',
    imageUrl: '',
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      Alert.alert('Access Denied', 'Only super admins can access this page');
      router.back();
      return;
    }
    loadCategories();
  }, [isSuperAdmin]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data) {
        setCategories(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description,
          parentId: row.parent_id,
          imageUrl: row.image_url,
          displayOrder: row.display_order,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parentId: category.parentId || '',
        displayOrder: category.displayOrder.toString(),
        imageUrl: category.imageUrl || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        displayOrder: '0',
        imageUrl: '',
      });
    }
    setShowModal(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingCategory ? formData.slug : generateSlug(name),
    });
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setIsUploadingImage(true);
          try {
            const fileExt = asset.uri.split('.').pop();
            const fileName = `category-${Date.now()}.${fileExt}`;
            const filePath = `category_images/${fileName}`;

            const { data, error } = await supabase.storage
              .from('category_images')
              .upload(filePath, decode(asset.base64), {
                contentType: asset.mimeType || 'image/jpeg',
                upsert: false,
              });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
              .from('category_images')
              .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
              setFormData({ ...formData, imageUrl: publicUrlData.publicUrl });
            }
          } catch (error: any) {
            console.error('Error uploading image:', error);
            Alert.alert('Upload Error', `Failed to upload image: ${(error as Error).message}`);
          } finally {
            setIsUploadingImage(false);
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      Alert.alert('Error', 'Please fill in name and slug');
      return;
    }

    try {
      const categoryData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        parent_id: formData.parentId || null,
        display_order: parseInt(formData.displayOrder) || 0,
        image_url: formData.imageUrl || null,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('product_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        Alert.alert('Success', 'Category updated successfully');
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert(categoryData);

        if (error) throw error;
        Alert.alert('Success', 'Category created successfully');
      }

      setShowModal(false);
      loadCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      Alert.alert('Error', error.message || 'Failed to save category');
    }
  };

  const handleDelete = async (categoryId: string) => {
    Alert.alert('Delete Category', 'Are you sure you want to delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('product_categories')
              .delete()
              .eq('id', categoryId);

            if (error) throw error;
            Alert.alert('Success', 'Category deleted successfully');
            loadCategories();
          } catch (error: any) {
            console.error('Failed to delete category:', error);
            Alert.alert('Error', error.message || 'Failed to delete category');
          }
        },
      },
    ]);
  };

  const getParentCategoryName = (parentId?: string) => {
    if (!parentId) return 'None';
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : 'Unknown';
  };

  if (!isSuperAdmin) {
    return null;
  }

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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Product Categories</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Folder size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>No categories yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
              Create your first category to get started
            </Text>
          </View>
        ) : (
          categories.map((category) => (
            <View key={category.id} style={[styles.categoryCard, { backgroundColor: theme.background.card }]}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryInfo}>
                  {category.imageUrl && (
                    <Image source={{ uri: category.imageUrl }} style={styles.categoryImage} />
                  )}
                  <View style={styles.categoryDetails}>
                    <Text style={[styles.categoryName, { color: theme.text.primary }]}>{category.name}</Text>
                    <Text style={[styles.categorySlug, { color: theme.text.tertiary }]}>/{category.slug}</Text>
                    {category.description && (
                      <Text style={[styles.categoryDesc, { color: theme.text.secondary }]} numberOfLines={2}>
                        {category.description}
                      </Text>
                    )}
                    <View style={styles.categoryMeta}>
                      <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                        Parent: {getParentCategoryName(category.parentId)}
                      </Text>
                      <Text style={[styles.metaText, { color: theme.text.tertiary }]}>
                        Order: {category.displayOrder}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                    onPress={() => handleOpenModal(category)}
                  >
                    <Edit size={18} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                    onPress={() => handleDelete(category.id)}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Category Form Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Category name"
                placeholderTextColor={theme.text.tertiary}
                value={formData.name}
                onChangeText={handleNameChange}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Slug *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="category-slug"
                placeholderTextColor={theme.text.tertiary}
                value={formData.slug}
                onChangeText={(text) => setFormData({ ...formData, slug: generateSlug(text) })}
              />
              <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                URL-friendly identifier (auto-generated from name)
              </Text>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Category description"
                placeholderTextColor={theme.text.tertiary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Parent Category</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: !formData.parentId ? theme.accent.primary : theme.background.secondary,
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, parentId: '' })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: !formData.parentId ? '#FFF' : theme.text.primary },
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {categories
                  .filter(c => !editingCategory || c.id !== editingCategory.id)
                  .map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.typeButton,
                        {
                          backgroundColor: formData.parentId === category.id ? theme.accent.primary : theme.background.secondary,
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, parentId: category.id })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          { color: formData.parentId === category.id ? '#FFF' : theme.text.primary },
                        ]}
                      >
                        {category.name}
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
              <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                Lower numbers appear first
              </Text>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Category Image</Text>
              {formData.imageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: formData.imageUrl }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setFormData({ ...formData, imageUrl: '' })}
                  >
                    <X size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePickerButton, { backgroundColor: theme.background.secondary }]}
                  onPress={handlePickImage}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator color={theme.accent.primary} />
                  ) : (
                    <>
                      <Folder size={24} color={theme.accent.primary} />
                      <Text style={[styles.imagePickerButtonText, { color: theme.accent.primary }]}>
                        Upload Image
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
              >
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  categorySlug: {
    fontSize: 12,
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 14,
    marginBottom: 8,
  },
  categoryMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 12,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
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
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerButton: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    marginBottom: 12,
    gap: 8,
  },
  imagePickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

