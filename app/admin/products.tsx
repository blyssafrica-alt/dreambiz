import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useProducts } from '@/contexts/ProductContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, Trash2, Package, X, Save, ImageIcon, FileText, Image as ImageIcon2, FolderOpen, Settings, DollarSign, Send, AlertTriangle, Upload, Star, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { PlatformProduct, ProductType, ProductStatus } from '@/types/super-admin';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { buildAssetFileName, getBase64FromAsset, uploadBase64ToStorage } from '@/lib/upload-utils';
import { decode } from 'base64-arraybuffer';

export default function ProductsManagementScreen() {
  const { theme } = useTheme();
  const { refreshProducts } = useProducts();
  const router = useRouter();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PlatformProduct | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [digitalFiles, setDigitalFiles] = useState<{ id: string; file_name: string; file_url: string; file_type?: string; size?: number; is_primary: boolean; sort_order: number }[]>([]);
  const [courseModules, setCourseModules] = useState<{ tempId: string; title: string; lessons: { tempId: string; title: string; content?: string; videoUrl?: string }[] }[]>([]);
  const [ticketTypes, setTicketTypes] = useState<{ tempId: string; name: string; price: string; quantity: string }[]>([]);
  const [productEditTab, setProductEditTab] = useState<'basics' | 'media' | 'assets' | 'type' | 'pricing' | 'publish'>('basics');

  const TAB_ORDER: ('basics' | 'media' | 'assets' | 'type' | 'pricing' | 'publish')[] = ['basics', 'media', 'assets', 'type', 'pricing', 'publish'];
  const currentStepIndex = TAB_ORDER.indexOf(productEditTab);
  const goToStep = (index: number) => {
    if (index >= 0 && index < TAB_ORDER.length) setProductEditTab(TAB_ORDER[index]);
  };
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
    deliveryType: '',
    deliveryConfig: {} as Record<string, string>,
  });

  const loadCategories = useCallback(async () => {
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
  }, []);

  const loadProducts = useCallback(async () => {
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
          basePrice: row.base_price,
          currency: row.currency,
          salePrice: row.sale_price,
          saleStartDate: row.sale_start_date,
          saleEndDate: row.sale_end_date,
          variations: row.variations || [],
          manageStock: row.manage_stock,
          stockQuantity: row.stock_quantity,
          lowStockThreshold: row.low_stock_threshold,
          stockStatus: row.stock_status || (row.manage_stock && row.stock_quantity > 0 ? 'in_stock' : 'out_of_stock'),
          status: row.status,
          featured: row.featured,
          visibilityRules: row.visibility_rules || {},
          categoryId: row.category_id,
          tags: row.tags,
          images: row.images || [],
          videoUrl: row.video_url || undefined,
          createdBy: row.created_by || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deliveryType: row.delivery_type || undefined,
          deliveryConfig: row.delivery_config || undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadCategories, loadProducts]);

  const loadDigitalFiles = useCallback(async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_files')
        .select('id, file_name, file_url, file_type, size, is_primary, sort_order')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setDigitalFiles((data || []).map((r: any) => ({
        id: r.id,
        file_name: r.file_name,
        file_url: r.file_url,
        file_type: r.file_type,
        size: r.size,
        is_primary: r.is_primary ?? false,
        sort_order: r.sort_order ?? 0,
      })));
    } catch (e) {
      console.error('Load product_files:', e);
      setDigitalFiles([]);
    }
  }, []);

  const handlePickDigitalFile = useCallback(async () => {
    const productId = editingProduct?.id;
    if (!productId) {
      Alert.alert('Save first', 'Save the product, then open it again to upload files in the Assets tab.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploadingAsset(true);
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileName = file.name || `file-${Date.now()}`;
      const mimeType = file.mimeType || 'application/octet-stream';
      const sizeBytes = file.size ?? 0;
      const path = `${productId}/digital/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('product-files').upload(path, decode(base64), {
        contentType: mimeType,
        upsert: false,
      });
      if (error) throw error;
      const fileUrl = path;
      const isFirst = digitalFiles.length === 0;
      const { data: row, error: insertErr } = await supabase
        .from('product_files')
        .insert({
          product_id: productId,
          file_name: fileName,
          file_url: fileUrl,
          file_type: mimeType,
          size: sizeBytes,
          is_primary: isFirst,
          sort_order: digitalFiles.length,
        })
        .select('id, file_name, file_url, file_type, size, is_primary, sort_order')
        .single();
      if (insertErr) throw insertErr;
      setDigitalFiles((prev) => [...prev, { id: row.id, file_name: row.file_name, file_url: row.file_url, file_type: row.file_type, size: row.size, is_primary: row.is_primary ?? false, sort_order: row.sort_order ?? prev.length }]);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not upload file. Ensure the product-files bucket exists.');
    } finally {
      setUploadingAsset(false);
    }
  }, [editingProduct?.id, digitalFiles.length]);

  const handleRemoveDigitalFile = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('product_files').delete().eq('id', id);
      if (error) throw error;
      setDigitalFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not remove file.');
    }
  }, []);

  const handleSetPrimaryDigitalFile = useCallback(async (id: string) => {
    const productId = editingProduct?.id;
    if (!productId) return;
    try {
      await supabase.from('product_files').update({ is_primary: false }).eq('product_id', productId);
      await supabase.from('product_files').update({ is_primary: true }).eq('id', id);
      setDigitalFiles((prev) => prev.map((f) => ({ ...f, is_primary: f.id === id })));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not set primary.');
    }
  }, [editingProduct?.id]);

  const genTempId = () => 't' + Date.now() + '-' + Math.random().toString(36).slice(2);

  const loadCourseData = useCallback(async (productId: string) => {
    try {
      const { data: courseRow } = await supabase.from('courses').select('id').eq('product_id', productId).maybeSingle();
      if (!courseRow) return setCourseModules([]);
      const { data: modules } = await supabase.from('course_modules').select('id, title, sort_order').eq('course_id', courseRow.id).order('sort_order');
      if (!modules?.length) return setCourseModules([]);
      const mods: { tempId: string; title: string; lessons: { tempId: string; title: string; content?: string; videoUrl?: string }[] }[] = [];
      for (const m of modules) {
        const { data: lessons } = await supabase.from('course_lessons').select('id, title, content, video_url, sort_order').eq('module_id', m.id).order('sort_order');
        mods.push({
          tempId: m.id,
          title: m.title || '',
          lessons: (lessons || []).map(l => ({ tempId: l.id, title: l.title || '', content: l.content, videoUrl: l.video_url })),
        });
      }
      setCourseModules(mods);
    } catch (e) {
      console.error('Failed to load course:', e);
      setCourseModules([]);
    }
  }, []);

  const loadEventData = useCallback(async (productId: string) => {
    try {
      const { data: eventRow } = await supabase.from('events').select('id').eq('product_id', productId).maybeSingle();
      if (!eventRow) return setTicketTypes([]);
      const { data: tt } = await supabase.from('ticket_types').select('id, name, price, quantity_total').eq('event_id', eventRow.id).order('sort_order');
      setTicketTypes((tt || []).map(t => ({ tempId: t.id, name: t.name || '', price: String(t.price ?? 0), quantity: String(t.quantity_total ?? 0) })));
    } catch (e) {
      console.error('Failed to load event:', e);
      setTicketTypes([]);
    }
  }, []);

  const handleOpenModal = (product?: PlatformProduct) => {
    setProductEditTab('basics');
    setDigitalFiles([]);
    setCourseModules([]);
    setTicketTypes([]);
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
        deliveryType: (product as any).deliveryType || (product.type === 'digital' ? 'download' : product.type === 'course' ? 'course' : product.type === 'event' ? 'event' : product.type === 'physical' ? 'shipping' : ''),
        deliveryConfig: (product as any).deliveryConfig || {},
      });
      if (product.type === 'digital') loadDigitalFiles(product.id);
      if (product.type === 'course') loadCourseData(product.id);
      if (product.type === 'event') loadEventData(product.id);
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
    deliveryType: '',
    deliveryConfig: {} as Record<string, string>,
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
      setIsUploadingImage(true);
      try {
        const base64 = await getBase64FromAsset(asset);
        const fileName = buildAssetFileName(asset, 'product');
        const filePath = `product_images/${fileName}`;

        const publicUrl = await uploadBase64ToStorage(supabase, {
          bucket: 'product_images',
          filePath,
          base64,
          contentType: asset.mimeType || 'image/jpeg',
          upsert: false,
        });

        setFormData(prev => ({
          ...prev,
          images: [...prev.images, publicUrl],
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Upload Error', `Failed to upload image: ${(error as Error).message}`);
      } finally {
        setIsUploadingImage(false);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
        created_by: user.id,
        delivery_type: formData.deliveryType || (formData.type === 'digital' ? 'download' : formData.type === 'course' ? 'course' : formData.type === 'event' ? 'event' : formData.type === 'physical' ? 'shipping' : null),
        delivery_config: Object.keys(formData.deliveryConfig || {}).length ? formData.deliveryConfig : {},
      };

      let productId: string;
      if (editingProduct) {
        const { error } = await supabase
          .from('platform_products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        productId = editingProduct.id;
      } else {
        const { data: inserted, error } = await supabase
          .from('platform_products')
          .insert(productData)
          .select('id')
          .single();
        if (error) throw error;
        productId = inserted.id;
      }

      if (formData.type === 'course') {
        const { data: existingCourse } = await supabase.from('courses').select('id').eq('product_id', productId).maybeSingle();
        let courseId: string;
        if (existingCourse) {
          courseId = existingCourse.id;
          await supabase.from('course_modules').delete().eq('course_id', courseId);
        } else if (courseModules.length > 0) {
          const { data: newCourse, error: courseErr } = await supabase.from('courses').insert({ product_id: productId }).select('id').single();
          if (courseErr) throw courseErr;
          courseId = newCourse.id;
        } else {
          courseId = '';
        }
        for (let i = 0; i < courseModules.length; i++) {
          const mod = courseModules[i];
          if (!mod.title.trim()) continue;
          const { data: modRow, error: modErr } = await supabase.from('course_modules').insert({ course_id: courseId, title: mod.title.trim(), sort_order: i }).select('id').single();
          if (modErr) throw modErr;
          for (let j = 0; j < mod.lessons.length; j++) {
            const les = mod.lessons[j];
            if (!les.title.trim()) continue;
            await supabase.from('course_lessons').insert({ module_id: modRow.id, title: les.title.trim(), content: les.content || null, video_url: les.videoUrl || null, sort_order: j });
          }
        }
      }

      if (formData.type === 'event') {
        const cfg = formData.deliveryConfig || {};
        const eventDateStr = cfg.eventDate || new Date(Date.now() + 86400000).toISOString().slice(0, 16);
        const startDt = new Date(eventDateStr).toISOString();
        const { data: existingEvent } = await supabase.from('events').select('id').eq('product_id', productId).maybeSingle();
        let eventId: string;
        if (existingEvent) {
          eventId = existingEvent.id;
          await supabase.from('events').update({
            start_datetime: startDt,
            venue_name: cfg.venueName || null,
            address: cfg.address || null,
            city: cfg.city || null,
            max_attendees: cfg.maxAttendees ? parseInt(cfg.maxAttendees, 10) : null,
          }).eq('id', eventId);
          await supabase.from('ticket_types').delete().eq('event_id', eventId);
        } else if (ticketTypes.length > 0) {
          const { data: newEvent, error: eventErr } = await supabase.from('events').insert({
            product_id: productId,
            start_datetime: startDt,
            venue_name: cfg.venueName || null,
            address: cfg.address || null,
            city: cfg.city || null,
            max_attendees: cfg.maxAttendees ? parseInt(cfg.maxAttendees, 10) : null,
          }).select('id').single();
          if (eventErr) throw eventErr;
          eventId = newEvent.id;
        } else {
          eventId = '';
        }
        for (let i = 0; i < ticketTypes.length; i++) {
          const tt = ticketTypes[i];
          if (!tt.name.trim()) continue;
          const price = parseFloat(tt.price) || 0;
          const qty = parseInt(tt.quantity, 10) || 0;
          await supabase.from('ticket_types').insert({ event_id: eventId, name: tt.name.trim(), price, quantity_total: qty, sort_order: i });
        }
      }

      Alert.alert('Success', 'Product saved successfully');
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

            <View style={[styles.tabRow, { borderBottomColor: theme.border.light }]}>
              {([
                { key: 'basics', label: 'Basics', icon: FileText },
                { key: 'media', label: 'Media', icon: ImageIcon2 },
                { key: 'assets', label: 'Assets', icon: FolderOpen },
                { key: 'type', label: 'Type Setup', icon: Settings },
                { key: 'pricing', label: 'Pricing', icon: DollarSign },
                { key: 'publish', label: 'Publish', icon: Send },
              ] as const).map(({ key, label, icon: Icon }, index) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.tab, productEditTab === key && { borderBottomColor: theme.accent.primary, borderBottomWidth: 2 }]}
                  onPress={() => setProductEditTab(key)}
                >
                  <Icon size={16} color={productEditTab === key ? theme.accent.primary : theme.text.tertiary} />
                  <Text style={[styles.tabLabel, { color: productEditTab === key ? theme.accent.primary : theme.text.secondary }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.stepIndicator, { color: theme.text.tertiary }]}>
              Step {(['basics', 'media', 'assets', 'type', 'pricing', 'publish'].indexOf(productEditTab) + 1)} of 6
            </Text>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {productEditTab === 'basics' && (
                <>
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
                {(['physical', 'digital', 'course', 'event', 'service', 'subscription'] as ProductType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: formData.type === type ? theme.accent.primary : theme.background.secondary,
                      },
                    ]}
                    onPress={() => setFormData({
                      ...formData,
                      type,
                      deliveryType: type === 'digital' ? 'download' : type === 'course' ? 'course' : type === 'event' ? 'event' : type === 'physical' ? 'shipping' : '',
                    })}
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

              <Text style={[styles.label, { color: theme.text.secondary }]}>Category</Text>
              {categories.length > 0 ? (
                <View style={styles.typeButtons}>
                  <TouchableOpacity
                    style={[styles.typeButton, { backgroundColor: !formData.categoryId ? theme.accent.primary : theme.background.secondary }]}
                    onPress={() => setFormData({ ...formData, categoryId: '' })}
                  >
                    <Text style={[styles.typeButtonText, { color: !formData.categoryId ? '#FFF' : theme.text.primary }]}>None</Text>
                  </TouchableOpacity>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.typeButton, { backgroundColor: formData.categoryId === category.id ? theme.accent.primary : theme.background.secondary }]}
                      onPress={() => setFormData({ ...formData, categoryId: category.id })}
                    >
                      <Text style={[styles.typeButtonText, { color: formData.categoryId === category.id ? '#FFF' : theme.text.primary }]}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.helperText, { color: theme.text.tertiary }]}>No categories available.</Text>
              )}

              <Text style={[styles.label, { color: theme.text.secondary }]}>Tags</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                placeholder="tag1, tag2 (comma separated)"
                placeholderTextColor={theme.text.tertiary}
                value={formData.tags}
                onChangeText={(text) => setFormData({ ...formData, tags: text })}
              />

              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Featured</Text>
                <Switch
                  value={formData.featured}
                  onValueChange={(value) => setFormData({ ...formData, featured: value })}
                  trackColor={{ false: theme.border.medium, true: theme.accent.primary }}
                  thumbColor="#FFF"
                />
              </View>
                </>
              )}

              {productEditTab === 'media' && (
                <>
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
                <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage} disabled={isUploadingImage}>
                  {isUploadingImage ? <ActivityIndicator color={theme.accent.primary} /> : (
                    <>
                      <ImageIcon size={24} color={theme.accent.primary} />
                      <Text style={[styles.imagePickerButtonText, { color: theme.accent.primary }]}>Add Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
                </>
              )}

              {productEditTab === 'assets' && (
                <View style={styles.deliverySection}>
                  {formData.type === 'digital' && (
                    <>
                      {(digitalFiles.length === 0 && !formData.deliveryConfig?.downloadUrl) && (
                        <View style={[styles.assetWarning, { backgroundColor: theme.accent.warning + '20', borderColor: theme.accent.warning }]}>
                          <AlertTriangle size={20} color={theme.accent.warning} />
                          <Text style={[styles.assetWarningText, { color: theme.text.primary }]}>
                            Your digital product has no files uploaded yet. Add files below or set a Download URL in Type Setup.
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.label, { color: theme.text.secondary }]}>Digital downloads</Text>
                      <Text style={[styles.helperText, { color: theme.text.tertiary }]}>PDF, DOC, DOCX, ZIP, images. Files are available to customers after purchase.</Text>
                      <TouchableOpacity
                        style={[styles.uploadFileButton, { backgroundColor: theme.accent.primary }]}
                        onPress={handlePickDigitalFile}
                        disabled={uploadingAsset || !editingProduct?.id}
                      >
                        {uploadingAsset ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Upload size={20} color="#FFF" />
                            <Text style={styles.uploadFileButtonText}>
                              {editingProduct?.id ? 'Upload file' : 'Save product first, then upload here'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      {digitalFiles.length > 0 && (
                        <View style={styles.fileList}>
                          {digitalFiles.map((f) => (
                            <View key={f.id} style={[styles.fileRow, { backgroundColor: theme.background.secondary }]}>
                              <FileText size={20} color={theme.text.tertiary} />
                              <View style={styles.fileRowBody}>
                                <Text style={[styles.fileRowName, { color: theme.text.primary }]} numberOfLines={1}>{f.file_name}</Text>
                                {f.size != null && (
                                  <Text style={[styles.fileRowMeta, { color: theme.text.tertiary }]}>
                                    {(f.size / 1024).toFixed(1)} KB{f.is_primary ? ' · Primary' : ''}
                                  </Text>
                                )}
                              </View>
                              <TouchableOpacity
                                onPress={() => handleSetPrimaryDigitalFile(f.id)}
                                style={[styles.fileRowAction, f.is_primary && { opacity: 0.7 }]}
                                disabled={f.is_primary}
                              >
                                <Star size={18} color={f.is_primary ? theme.accent.primary : theme.text.tertiary} fill={f.is_primary ? theme.accent.primary : 'transparent'} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleRemoveDigitalFile(f.id)} style={styles.fileRowAction}>
                                <Trash2 size={18} color={theme.accent.danger} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                  {formData.type === 'course' && (
                    <>
                      {courseModules.length === 0 && (
                        <View style={[styles.assetWarning, { backgroundColor: theme.accent.warning + '20', borderColor: theme.accent.warning }]}>
                          <AlertTriangle size={20} color={theme.accent.warning} />
                          <Text style={[styles.assetWarningText, { color: theme.text.primary }]}>
                            Add modules and lessons below to build your course outline.
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.label, { color: theme.text.secondary }]}>Course modules & lessons</Text>
                      <Text style={[styles.helperText, { color: theme.text.tertiary }]}>Add modules, then add lessons under each module. All saved with the product.</Text>
                      <TouchableOpacity
                        style={[styles.uploadFileButton, { backgroundColor: theme.accent.primary }]}
                        onPress={() => setCourseModules(prev => [...prev, { tempId: genTempId(), title: '', lessons: [] }])}
                      >
                        <Plus size={20} color="#FFF" />
                        <Text style={styles.uploadFileButtonText}>Add module</Text>
                      </TouchableOpacity>
                      {courseModules.map((mod, modIdx) => (
                        <View key={mod.tempId} style={[styles.courseModuleCard, { backgroundColor: theme.background.secondary, borderColor: theme.border.medium }]}>
                          <View style={styles.courseModuleHeader}>
                            <Text style={[styles.courseModuleLabel, { color: theme.text.secondary }]}>Module {modIdx + 1}</Text>
                            <TouchableOpacity onPress={() => setCourseModules(prev => prev.filter((_, i) => i !== modIdx))}>
                              <Trash2 size={18} color={theme.accent.danger} />
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.background.primary, color: theme.text.primary }]}
                            placeholder="Module title"
                            placeholderTextColor={theme.text.tertiary}
                            value={mod.title}
                            onChangeText={(t) => setCourseModules(prev => prev.map((m, i) => i === modIdx ? { ...m, title: t } : m))}
                          />
                          {mod.lessons.map((les, lesIdx) => (
                            <View key={les.tempId} style={[styles.lessonRow, { backgroundColor: theme.background.primary }]}>
                              <Text style={[styles.lessonNum, { color: theme.text.tertiary }]}>{lesIdx + 1}.</Text>
                              <TextInput
                                style={[styles.input, styles.lessonTitleInput, { backgroundColor: theme.background.primary, color: theme.text.primary }]}
                                placeholder="Lesson title"
                                placeholderTextColor={theme.text.tertiary}
                                value={les.title}
                                onChangeText={(t) => setCourseModules(prev => prev.map((m, mi) => mi === modIdx ? { ...m, lessons: m.lessons.map((l, li) => li === lesIdx ? { ...l, title: t } : l) } : m))}
                              />
                              <TouchableOpacity onPress={() => setCourseModules(prev => prev.map((m, i) => i === modIdx ? { ...m, lessons: m.lessons.filter((_, li) => li !== lesIdx) } : m))}>
                                <Trash2 size={16} color={theme.accent.danger} />
                              </TouchableOpacity>
                            </View>
                          ))}
                          <TouchableOpacity
                            style={[styles.addLessonBtn, { borderColor: theme.border.medium }]}
                            onPress={() => setCourseModules(prev => prev.map((m, i) => i === modIdx ? { ...m, lessons: [...m.lessons, { tempId: genTempId(), title: '', content: '', videoUrl: '' }] } : m))}
                          >
                            <Plus size={16} color={theme.accent.primary} />
                            <Text style={[styles.addLessonBtnText, { color: theme.accent.primary }]}>Add lesson</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                  {formData.type === 'event' && (
                    <>
                      {ticketTypes.length === 0 && (
                        <View style={[styles.assetWarning, { backgroundColor: theme.accent.warning + '20', borderColor: theme.accent.warning }]}>
                          <AlertTriangle size={20} color={theme.accent.warning} />
                          <Text style={[styles.assetWarningText, { color: theme.text.primary }]}>
                            Add ticket types below (e.g. General, VIP). All saved with the product.
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.label, { color: theme.text.secondary }]}>Ticket types</Text>
                      <Text style={[styles.helperText, { color: theme.text.tertiary }]}>Name, price, and quantity for each ticket type.</Text>
                      <TouchableOpacity
                        style={[styles.uploadFileButton, { backgroundColor: theme.accent.primary }]}
                        onPress={() => setTicketTypes(prev => [...prev, { tempId: genTempId(), name: '', price: '0', quantity: '0' }])}
                      >
                        <Plus size={20} color="#FFF" />
                        <Text style={styles.uploadFileButtonText}>Add ticket type</Text>
                      </TouchableOpacity>
                      {ticketTypes.map((tt, idx) => (
                        <View key={tt.tempId} style={[styles.ticketTypeCard, { backgroundColor: theme.background.secondary, borderColor: theme.border.medium }]}>
                          <View style={styles.ticketTypeHeader}>
                            <Text style={[styles.ticketTypeLabel, { color: theme.text.secondary }]}>Ticket {idx + 1}</Text>
                            <TouchableOpacity onPress={() => setTicketTypes(prev => prev.filter((_, i) => i !== idx))}>
                              <Trash2 size={18} color={theme.accent.danger} />
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.background.primary, color: theme.text.primary }]}
                            placeholder="Name (e.g. General, VIP)"
                            placeholderTextColor={theme.text.tertiary}
                            value={tt.name}
                            onChangeText={(t) => setTicketTypes(prev => prev.map((x, i) => i === idx ? { ...x, name: t } : x))}
                          />
                          <View style={styles.ticketTypeRow}>
                            <TextInput
                              style={[styles.input, styles.ticketPriceInput, { backgroundColor: theme.background.primary, color: theme.text.primary }]}
                              placeholder="Price"
                              placeholderTextColor={theme.text.tertiary}
                              value={tt.price}
                              onChangeText={(t) => setTicketTypes(prev => prev.map((x, i) => i === idx ? { ...x, price: t } : x))}
                              keyboardType="decimal-pad"
                            />
                            <TextInput
                              style={[styles.input, styles.ticketQtyInput, { backgroundColor: theme.background.primary, color: theme.text.primary }]}
                              placeholder="Qty"
                              placeholderTextColor={theme.text.tertiary}
                              value={tt.quantity}
                              onChangeText={(t) => setTicketTypes(prev => prev.map((x, i) => i === idx ? { ...x, quantity: t } : x))}
                              keyboardType="number-pad"
                            />
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                  {(formData.type === 'physical' || formData.type === 'service' || formData.type === 'subscription') && (
                    <Text style={[styles.helperText, { color: theme.text.tertiary }]}>No asset uploads for this product type. Use Media tab for images and Pricing for inventory.</Text>
                  )}
                </View>
              )}

              {productEditTab === 'type' && (
                <>
              {(formData.type === 'digital' || formData.type === 'course' || formData.type === 'event') && (
                <View style={styles.deliverySection}>
                  <Text style={[styles.label, { color: theme.text.secondary }]}>Delivery options</Text>
                  {formData.type === 'digital' && (
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      placeholder="Download URL (or add files in Product Files later)"
                      placeholderTextColor={theme.text.tertiary}
                      value={formData.deliveryConfig?.downloadUrl || ''}
                      onChangeText={(text) => setFormData({ ...formData, deliveryConfig: { ...formData.deliveryConfig, downloadUrl: text } })}
                    />
                  )}
                  {formData.type === 'course' && (
                    <>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="Course link (e.g. WhatsApp group)"
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.deliveryConfig?.courseLink || ''}
                        onChangeText={(text) => setFormData({ ...formData, deliveryConfig: { ...formData.deliveryConfig, courseLink: text } })}
                      />
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="Platform (e.g. whatsapp, telegram)"
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.deliveryConfig?.coursePlatform || ''}
                        onChangeText={(text) => setFormData({ ...formData, deliveryConfig: { ...formData.deliveryConfig, coursePlatform: text } })}
                      />
                    </>
                  )}
                  {formData.type === 'event' && (
                    <>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="Event date (e.g. 2025-03-15 18:00)"
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.deliveryConfig?.eventDate || ''}
                        onChangeText={(text) => setFormData({ ...formData, deliveryConfig: { ...formData.deliveryConfig, eventDate: text } })}
                      />
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="Venue name"
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.deliveryConfig?.venueName || ''}
                        onChangeText={(text) => setFormData({ ...formData, deliveryConfig: { ...formData.deliveryConfig, venueName: text } })}
                      />
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="Address"
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.deliveryConfig?.address || ''}
                        onChangeText={(text) => setFormData({ ...formData, deliveryConfig: { ...formData.deliveryConfig, address: text } })}
                      />
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="City"
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.deliveryConfig?.city || ''}
                        onChangeText={(text) => setFormData({ ...formData, deliveryConfig: { ...formData.deliveryConfig, city: text } })}
                      />
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                        placeholder="Max attendees (optional)"
                        placeholderTextColor={theme.text.tertiary}
                        value={formData.deliveryConfig?.maxAttendees || ''}
                        onChangeText={(text) => setFormData({ ...formData, deliveryConfig: { ...formData.deliveryConfig, maxAttendees: text } })}
                        keyboardType="numeric"
                      />
                    </>
                  )}
                </View>
              )}
                </>
              )}

              {productEditTab === 'pricing' && (
                <>
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
                </>
              )}

              {productEditTab === 'publish' && (
                <>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Status</Text>
              <View style={styles.typeButtons}>
                {(['draft', 'published', 'archived'] as ProductStatus[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.typeButton,
                      { backgroundColor: formData.status === status ? theme.accent.primary : theme.background.secondary },
                    ]}
                    onPress={() => setFormData({ ...formData, status })}
                  >
                    <Text style={[styles.typeButtonText, { color: formData.status === status ? '#FFF' : theme.text.primary }]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.helperText, { color: theme.text.tertiary }]}>Publish when ready. Use Assets tab to ensure digital/course/event have required content.</Text>
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
              <View style={styles.stepNavRow}>
                {currentStepIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.background.secondary, borderColor: theme.border.medium }]}
                    onPress={() => goToStep(currentStepIndex - 1)}
                  >
                    <ChevronLeft size={18} color={theme.text.primary} />
                    <Text style={[styles.backButtonText, { color: theme.text.primary }]}>Back</Text>
                  </TouchableOpacity>
                )}
                {currentStepIndex < TAB_ORDER.length - 1 ? (
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                    onPress={() => goToStep(currentStepIndex + 1)}
                  >
                    <Text style={styles.saveButtonText}>Next</Text>
                    <ChevronRight size={18} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                    onPress={handleSave}
                  >
                    <Save size={18} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                )}
              </View>
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
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
    minHeight: '70%',
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
  modalBodyContent: {
    paddingBottom: 56,
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
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  assetWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  assetWarningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  stepIndicator: {
    fontSize: 12,
    marginTop: 6,
    marginHorizontal: 16,
  },
  uploadFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  uploadFileButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fileList: {
    gap: 8,
    marginTop: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  fileRowBody: { flex: 1, minWidth: 0 },
  fileRowName: { fontSize: 14, fontWeight: '600' },
  fileRowMeta: { fontSize: 12, marginTop: 2 },
  fileRowAction: { padding: 6 },
  deliverySection: {
    marginBottom: 16,
    gap: 10,
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
  stepNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  courseModuleCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  courseModuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseModuleLabel: { fontSize: 13, fontWeight: '600' },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lessonNum: { fontSize: 14, width: 24 },
  lessonTitleInput: { flex: 1, marginBottom: 0 },
  addLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addLessonBtnText: { fontSize: 14, fontWeight: '600' },
  ticketTypeCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  ticketTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketTypeLabel: { fontSize: 13, fontWeight: '600' },
  ticketTypeRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  ticketPriceInput: { flex: 1, marginBottom: 0 },
  ticketQtyInput: { flex: 1, marginBottom: 0 },
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

