import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Edit, Trash2, Package } from 'lucide-react-native';
import type { PlatformProduct } from '@/types/super-admin';

export default function ProductsManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

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

  const filteredProducts = products.filter(p =>
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
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Product Management
        </Text>
        <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Product creation UI coming soon')}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.background.card }]}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: theme.background.secondary,
            color: theme.text.primary,
          }]}
          placeholder="Search products..."
          placeholderTextColor={theme.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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
            <View
              key={product.id}
              style={[styles.productCard, { backgroundColor: theme.background.card }]}
            >
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: theme.text.primary }]}>
                    {product.name}
                  </Text>
                  {product.description && (
                    <Text style={[styles.productDesc, { color: theme.text.secondary }]} numberOfLines={2}>
                      {product.description}
                    </Text>
                  )}
                  <View style={styles.productMeta}>
                    <View style={[styles.badge, { 
                      backgroundColor: product.status === 'published' ? '#10B98120' : '#64748B20' 
                    }]}>
                      <Text style={[styles.badgeText, { 
                        color: product.status === 'published' ? '#10B981' : '#64748B' 
                      }]}>
                        {product.status}
                      </Text>
                    </View>
                    <Text style={[styles.price, { color: theme.text.primary }]}>
                      {product.currency} {product.basePrice.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.surface.info }]}
                    onPress={() => Alert.alert('Coming Soon', 'Edit product UI coming soon')}
                  >
                    <Edit size={18} color={theme.accent.info} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.surface.danger }]}
                    onPress={() => Alert.alert('Delete', 'Delete product?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => {
                        // TODO: Implement delete
                      }},
                    ])}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  },
  productCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
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
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

