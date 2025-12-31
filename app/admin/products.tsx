import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts } from '@/contexts/ProductContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, Trash2, Package, X, Save, ImageIcon } from 'lucide-react-native';
import type { PlatformProduct, ProductType, ProductStatus, StockStatus } from '@/types/super-admin';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { decode } from 'base64-arraybuffer';

export default function ProductsManagementScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { refreshProducts } = useProducts();
  const router = useRouter();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PlatformProduct | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    sku: '',
    type: 'physical' as ProductType,
    basePrice: '',
    currency: 'USD',
    salePrice: '',
    saleStartDate: '',
    saleEndDate: '',
    manageStock: false,
    stockQuantity: '',
    lowStockThreshold: '',
    status: 'draft' as ProductStatus,
    featured: false,
    categoryId: '',
    tags: '',
    images: [] as string[],
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      if (data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('platform_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setProducts(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          shortDescription: row.short_description,
          sku: row.sku,
          type: row.type,
          basePrice: parseFloat(row.base_price),
          currency: row.currency,
          salePrice: row.sale_price ? parseFloat(row.sale_price) : undefined,
          saleStartDate: row.sale_start_date,
          saleEndDate: row.sale_end_date,
          variations: row.variations || [],
          manageStock: row.manage_stock,
          stockQuantity: row.stock_quantity,
          lowStockThreshold: row.low_stock_threshold,
          stockStatus: row.stock_status,
          images: row.images || [],
          videoUrl: row.video_url,
          categoryId: row.category_id,
          tags: row.tags || [],
          visibilityRules: row.visibility_rules || {},
          status: row.status,
          featured: row.featured,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (product?: PlatformProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        sku: product.sku || '',
        type: product.type,
        basePrice: product.basePrice.toString(),
        saleStartDate: product.saleStartDate ? product.saleStartDate.split('T')[0] : '',
        saleEndDate: product.saleEndDate ? product.saleEndDate.split('T')[0] : '',
        categoryId: product.categoryId || '',
        tags: product.tags?.join(', ') || '',
        currency: product.currency,
        salePrice: product.salePrice?.toString() || '',
        manageStock: product.manageStock,
        stockQuantity: product.stockQuantity.toString(),
        lowStockThreshold: product.lowStockThreshold.toString(),
        status: product.status,
        featured: product.featured,
        images: product.images || [],
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        shortDescription: '',
        sku: '',
        type: 'physical',
        basePrice: '',
        currency: 'USD',
        salePrice: '',
        saleStartDate: '',
        saleEndDate: '',
        manageStock: false,
        stockQuantity: '',
        lowStockThreshold: '',
        status: 'draft',
        featured: false,
        categoryId: '',
        tags: '',
        images: [],
      });
    }
    setShowModal(true);
  };

  const handlePickImage = async () => {
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
        const base64 = asset.base64;
        const fileExt = asset.uri.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `product_images/${fileName}`;

        try {
          const { data, error } = await supabase.storage
            .from('product_images')
            .upload(filePath, decode(base64), {
              contentType: asset.mimeType || 'image/jpeg',
              upsert: false,
            });

          if (error) throw error;

          const { data: publicUrlData } = supabase.storage
            .from('product_images')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            setFormData(prev => ({
              ...prev,
              images: [...prev.images, publicUrlData.publicUrl],
            }));
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Upload Error', `Failed to upload image: ${(error as Error).message}`);
        }
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.basePrice) {
      Alert.alert('Error', 'Please fill in name and base price');
      return;
    }

    try {
      const productData: any = {
        name: formData.name,
        description: formData.description || null,
        short_description: formData.shortDescription || null,
        sku: formData.sku || null,
        type: formData.type,
        base_price: parseFloat(formData.basePrice),
        currency: formData.currency,
        sale_price: formData.salePrice ? parseFloat(formData.salePrice) : null,
        sale_start_date: formData.saleStartDate ? new Date(formData.saleStartDate).toISOString() : null,
        sale_end_date: formData.saleEndDate ? new Date(formData.saleEndDate).toISOString() : null,
        manage_stock: formData.manageStock,
        stock_quantity: formData.manageStock ? parseInt(formData.stockQuantity) : 0,
        low_stock_threshold: formData.manageStock ? parseInt(formData.lowStockThreshold) : 0,
        stock_status: formData.manageStock && parseInt(formData.stockQuantity) > 0 ? 'in_stock' : 'out_of_stock',
        images: formData.images,
        category_id: formData.categoryId || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        status: formData.status,
        featured: formData.featured,
        created_by: user?.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('platform_products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        Alert.alert('Success', 'Product updated successfully');
      } else {
        const { error } = await supabase
          .from('platform_products')
          .insert(productData);

        if (error) throw error;
        Alert.alert('Success', 'Product created successfully');
      }

      setShowModal(false);
      loadProducts();
      // Refresh ProductContext so store screen shows updated products
      await refreshProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const handleDelete = async (productId: string) => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('platform_products')
              .delete()
              .eq('id', productId);

            if (error) throw error;
            Alert.alert('Success', 'Product deleted successfully');
            loadProducts();
            // Refresh ProductContext so store screen shows updated products
            await refreshProducts();
          } catch (error) {
            console.error('Failed to delete product:', error);
            Alert.alert('Error', 'Failed to delete product');
          }
        },
      },
    ]);
  };

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Product Management</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.background.card }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
          placeholder="Search products..."
          placeholderTextColor={theme.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Add Product Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addProductButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => handleOpenModal()}
        >
          <Plus size={24} color="#FFF" />
          <Text style={styles.addProductButtonText}>Add New Product</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              {searchQuery ? 'No products found' : 'No products yet'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
              {searchQuery ? 'Try a different search term' : 'Create your first product to get started'}
            </Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <TouchableOpacity 
              key={product.id} 
              style={[styles.productCard, { backgroundColor: theme.background.card }]}
              onPress={() => handleOpenModal(product)}
            >
              {/* Product Image on Left */}
              <View style={styles.productImageContainer}>
                {product.images && product.images.length > 0 ? (
                  <Image source={{ uri: product.images[0] }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImagePlaceholder, { backgroundColor: theme.background.secondary }]}>
                    <Package size={24} color={theme.text.tertiary} />
                  </View>
                )}
              </View>
              
              {/* Product Info on Right */}
              <View style={styles.productContent}>
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: theme.text.primary }]} numberOfLines={1}>
                      {product.name}
                    </Text>
                    {product.description && (
                      <Text style={[styles.productDesc, { color: theme.text.secondary }]} numberOfLines={2}>
                        {product.description}
                      </Text>
                    )}
                    <View style={styles.productMeta}>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: product.status === 'published' ? '#10B98120' : '#64748B20' },
                        ]}
                      >
                        <Text
                          style={[styles.badgeText, { color: product.status === 'published' ? '#10B981' : '#64748B' }]}
                        >
                          {product.status}
                        </Text>
                      </View>
                      <Text style={[styles.price, { color: theme.text.primary }]}>
                        {product.currency} {product.basePrice.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleOpenModal(product);
                    }}
                  >
                    <Edit size={16} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(product.id);
                    }}
                  >
                    <Trash2 size={16} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Product Form Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingProduct ? 'Edit Product' : 'Create Product'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Product name"
                placeholderTextColor={theme.text.tertiary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Short Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Brief product description (shown in listings)"
                placeholderTextColor={theme.text.tertiary}
                value={formData.shortDescription}
                onChangeText={(text) => setFormData({ ...formData, shortDescription: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Full Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="Detailed product description"
                placeholderTextColor={theme.text.tertiary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>SKU</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="SKU"
                placeholderTextColor={theme.text.tertiary}
                value={formData.sku}
                onChangeText={(text) => setFormData({ ...formData, sku: text })}
              />

              <Text style={[styles.label, { color: theme.text.secondary }]}>Type</Text>
              <View style={styles.typeButtons}>
                {(['physical', 'digital', 'service', 'subscription'] as ProductType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: formData.type === type ? theme.accent.primary : theme.background.secondary,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, type })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: formData.type === type ? '#FFF' : theme.text.primary },
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Base Price *</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.input, styles.priceInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  value={formData.basePrice}
                  onChangeText={(text) => setFormData({ ...formData, basePrice: text })}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.currencyInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="USD"
                  placeholderTextColor={theme.text.tertiary}
                  value={formData.currency}
                  onChangeText={(text) => setFormData({ ...formData, currency: text })}
                />
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Sale Price (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="0.00"
                placeholderTextColor={theme.text.tertiary}
                value={formData.salePrice}
                onChangeText={(text) => setFormData({ ...formData, salePrice: text })}
                keyboardType="decimal-pad"
              />

              {formData.salePrice && (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Sale Start Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.saleStartDate}
                    onChangeText={(text) => setFormData({ ...formData, saleStartDate: text })}
                  />

                  <Text style={[styles.label, { color: theme.text.secondary }]}>Sale End Date</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.saleEndDate}
                    onChangeText={(text) => setFormData({ ...formData, saleEndDate: text })}
                  />
                </>
              )}

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Manage Stock</Text>
                <Switch
                  value={formData.manageStock}
                  onValueChange={(value) => setFormData({ ...formData, manageStock: value })}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>

              {formData.manageStock && (
                <>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Stock Quantity</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="0"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.stockQuantity}
                    onChangeText={(text) => setFormData({ ...formData, stockQuantity: text })}
                    keyboardType="numeric"
                  />

                  <Text style={[styles.label, { color: theme.text.secondary }]}>Low Stock Threshold</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    placeholder="0"
                    placeholderTextColor={theme.text.tertiary}
                    value={formData.lowStockThreshold}
                    onChangeText={(text) => setFormData({ ...formData, lowStockThreshold: text })}
                    keyboardType="numeric"
                  />
                </>
              )}

              <Text style={[styles.label, { color: theme.text.secondary }]}>Status</Text>
              <View style={styles.typeButtons}>
                {(['draft', 'published', 'archived'] as ProductStatus[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: formData.status === status ? theme.accent.primary : theme.background.secondary,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: formData.status === status ? '#FFF' : theme.text.primary },
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Category</Text>
              {categories.length > 0 ? (
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: !formData.categoryId ? theme.accent.primary : theme.background.secondary,
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, categoryId: '' })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: !formData.categoryId ? '#FFF' : theme.text.primary },
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.typeButton,
                        {
                          backgroundColor: formData.categoryId === category.id ? theme.accent.primary : theme.background.secondary,
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, categoryId: category.id })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          { color: formData.categoryId === category.id ? '#FFF' : theme.text.primary },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                  No categories available. Create categories first.
                </Text>
              )}

              <Text style={[styles.label, { color: theme.text.secondary }]}>Tags</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="tag1, tag2, tag3 (comma separated)"
                placeholderTextColor={theme.text.tertiary}
                value={formData.tags}
                onChangeText={(text) => setFormData({ ...formData, tags: text })}
              />
              <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                Separate tags with commas
              </Text>

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Featured</Text>
                <Switch
                  value={formData.featured}
                  onValueChange={(value) => setFormData({ ...formData, featured: value })}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>

              <Text style={[styles.label, { color: theme.text.secondary }]}>Product Images</Text>
              <View style={styles.imageUploadContainer}>
                {formData.images.map((imageUri, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    <TouchableOpacity onPress={() => handleRemoveImage(index)} style={styles.removeImageButton}>
                      <X size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                  <ImageIcon size={24} color={theme.accent.primary} />
                  <Text style={[styles.imagePickerButtonText, { color: theme.accent.primary }]}>Add Image</Text>
                </TouchableOpacity>
              </View>
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
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  addButtonContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addProductButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 24,
  },
  emptyAddButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productHeader: {
    flex: 1,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    alignSelf: 'flex-end',
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInput: {
    flex: 2,
  },
  currencyInput: {
    flex: 1,
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
    textTransform: 'capitalize',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
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
  imageUploadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  imagePickerButton: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  imagePickerButtonText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    padding: 3,
  },
});
