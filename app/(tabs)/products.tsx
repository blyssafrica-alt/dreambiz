import { Stack } from 'expo-router';
import { 
  Plus, 
  Package,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  X
} from 'lucide-react-native';
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Modal,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Product } from '@/types/business';

const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Food & Beverages',
  'Furniture',
  'Books',
  'Tools',
  'Beauty & Personal Care',
  'Sports & Outdoors',
  'Home & Garden',
  'Other'
];

export default function ProductsScreen() {
  const { business, products, addProduct, updateProduct, deleteProduct } = useBusiness();
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    return filtered;
  }, [products, searchQuery, selectedCategory]);

  // Low stock threshold (can be made configurable)
  const lowStockThreshold = 10;
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.quantity <= lowStockThreshold && p.isActive);
  }, [products, lowStockThreshold]);

  // Product performance analytics
  const productAnalytics = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const lowStockCount = lowStockProducts.length;
    const outOfStockCount = products.filter(p => p.quantity === 0 && p.isActive).length;
    
    // Calculate total inventory value
    const totalInventoryValue = products.reduce((sum, p) => {
      return sum + (p.costPrice * p.quantity);
    }, 0);

    // Best selling products (by quantity sold - would need transaction data)
    // For now, we'll use products with highest quantity as proxy
    const bestSelling = [...products]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Products with best profit margin
    const bestMargin = [...products]
      .filter(p => p.costPrice > 0 && p.sellingPrice > p.costPrice)
      .map(p => ({
        ...p,
        margin: ((p.sellingPrice - p.costPrice) / p.costPrice) * 100,
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);

    return {
      totalProducts,
      activeProducts,
      lowStockCount,
      outOfStockCount,
      totalInventoryValue,
      bestSelling,
      bestMargin,
    };
  }, [products, lowStockProducts]);

  const handleSave = async () => {
    if (!name || !costPrice || !sellingPrice) {
      RNAlert.alert('Missing Fields', 'Please fill in name, cost price, and selling price');
      return;
    }

    const cost = parseFloat(costPrice);
    const selling = parseFloat(sellingPrice);
    const qty = parseInt(quantity) || 0;

    if (cost < 0 || selling < 0) {
      RNAlert.alert('Invalid Price', 'Prices cannot be negative');
      return;
    }

    if (selling < cost) {
      RNAlert.alert('Invalid Price', 'Selling price should be higher than cost price');
      return;
    }

    try {
      if (editingId) {
        await updateProduct(editingId, {
          name,
          description: description || undefined,
          costPrice: cost,
          sellingPrice: selling,
          currency: business?.currency || 'USD',
          quantity: qty,
          category: category || undefined,
          isActive,
          isTaxExempt,
        });
      } else {
        await addProduct({
          name,
          description: description || undefined,
          costPrice: cost,
          sellingPrice: selling,
          currency: business?.currency || 'USD',
          quantity: qty,
          category: category || undefined,
          isActive,
          isTaxExempt,
        });
      }

      handleCloseModal();
      RNAlert.alert('Success', editingId ? 'Product updated' : 'Product added');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description || '');
    setCostPrice(product.costPrice.toString());
    setSellingPrice(product.sellingPrice.toString());
    setQuantity(product.quantity.toString());
    setCategory(product.category || '');
    setIsActive(product.isActive);
    setIsTaxExempt(product.isTaxExempt || false);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(id);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setCostPrice('');
    setSellingPrice('');
    setQuantity('');
    setCategory('');
    setIsActive(true);
    setIsTaxExempt(false);
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const calculateProfitMargin = (cost: number, selling: number) => {
    if (selling === 0) return 0;
    return ((selling - cost) / selling) * 100;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Products', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Products</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {lowStockProducts.length > 0 && (
        <View style={[styles.alertBanner, { backgroundColor: theme.surface.warning }]}>
          <AlertTriangle size={20} color={theme.accent.warning} />
          <Text style={[styles.alertText, { color: theme.accent.warning }]}>
            {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} running low on stock
          </Text>
        </View>
      )}

      <View style={[styles.searchContainer, { backgroundColor: theme.background.card }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.background.secondary }]}>
          <Search size={18} color={theme.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder="Search products..."
            placeholderTextColor={theme.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: selectedCategory ? theme.accent.primary : theme.background.secondary }]}
          onPress={() => setShowCategoryFilter(true)}
        >
          <Filter size={18} color={selectedCategory ? '#fff' : theme.text.tertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Product Analytics Summary */}
        {products.length > 0 && (
          <View style={[styles.analyticsCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.analyticsTitle, { color: theme.text.primary }]}>Inventory Overview</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsValue, { color: theme.text.primary }]}>
                  {productAnalytics.totalProducts}
                </Text>
                <Text style={[styles.analyticsLabel, { color: theme.text.secondary }]}>Total Products</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsValue, { color: theme.accent.success }]}>
                  {productAnalytics.activeProducts}
                </Text>
                <Text style={[styles.analyticsLabel, { color: theme.text.secondary }]}>Active</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsValue, { color: productAnalytics.lowStockCount > 0 ? theme.accent.warning : theme.text.primary }]}>
                  {productAnalytics.lowStockCount}
                </Text>
                <Text style={[styles.analyticsLabel, { color: theme.text.secondary }]}>Low Stock</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={[styles.analyticsValue, { color: theme.text.primary }]}>
                  {formatCurrency(productAnalytics.totalInventoryValue)}
                </Text>
                <Text style={[styles.analyticsLabel, { color: theme.text.secondary }]}>Inventory Value</Text>
              </View>
            </View>
          </View>
        )}

        {/* Best Margin Products */}
        {productAnalytics.bestMargin.length > 0 && (
          <View style={[styles.analyticsCard, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.analyticsTitle, { color: theme.text.primary }]}>Top Profit Margins</Text>
            {productAnalytics.bestMargin.map((product, index) => (
              <View key={product.id} style={styles.topProductRow}>
                <Text style={[styles.topProductRank, { color: theme.text.tertiary }]}>{index + 1}</Text>
                <View style={styles.topProductInfo}>
                  <Text style={[styles.topProductName, { color: theme.text.primary }]}>{product.name}</Text>
                  <Text style={[styles.topProductMargin, { color: theme.accent.success }]}>
                    {product.margin.toFixed(1)}% margin
                  </Text>
                </View>
                <Text style={[styles.topProductPrice, { color: theme.text.primary }]}>
                  {formatCurrency(product.sellingPrice)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              {products.length === 0 ? 'No products yet' : 'No products match your search'}
            </Text>
            {products.length === 0 && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
                onPress={() => setShowModal(true)}
              >
                <Text style={styles.emptyButtonText}>Add Your First Product</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredProducts.map(product => {
            const profitMargin = calculateProfitMargin(product.costPrice, product.sellingPrice);
            const isLowStock = product.quantity <= lowStockThreshold && product.isActive;
            const isOutOfStock = product.quantity === 0 && product.isActive;
            
            return (
              <View
                key={product.id}
                style={[
                  styles.productCard,
                  { backgroundColor: theme.background.card },
                  !product.isActive && { opacity: 0.6 },
                  isLowStock && { borderLeftWidth: 4, borderLeftColor: theme.accent.warning },
                  isOutOfStock && { borderLeftWidth: 4, borderLeftColor: theme.accent.danger }
                ]}
              >
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: theme.text.primary }]}>
                      {product.name}
                    </Text>
                    {product.category && (
                      <Text style={[styles.productCategory, { color: theme.text.tertiary }]}>
                        {product.category}
                      </Text>
                    )}
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(product)}
                    >
                      <Edit2 size={18} color={theme.accent.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(product.id)}
                    >
                      <Trash2 size={18} color={theme.accent.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {product.description && (
                  <Text style={[styles.productDescription, { color: theme.text.secondary }]}>
                    {product.description}
                  </Text>
                )}

                <View style={styles.productDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Cost:</Text>
                    <Text style={[styles.detailValue, { color: theme.text.secondary }]}>
                      {formatCurrency(product.costPrice)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Price:</Text>
                    <Text style={[styles.detailValue, { color: theme.text.primary, fontWeight: '600' }]}>
                      {formatCurrency(product.sellingPrice)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Margin:</Text>
                    <Text style={[styles.detailValue, { color: profitMargin > 30 ? '#10B981' : profitMargin > 15 ? '#F59E0B' : '#EF4444' }]}>
                      {profitMargin.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.text.tertiary }]}>Stock:</Text>
                    <Text style={[
                      styles.detailValue,
                      { color: isLowStock ? theme.accent.warning : theme.text.primary, fontWeight: '600' }
                    ]}>
                      {product.quantity} {isLowStock && '⚠️'}
                    </Text>
                  </View>
                </View>

                {!product.isActive && (
                  <View style={[styles.inactiveBadge, { backgroundColor: theme.surface.danger }]}>
                    <Text style={[styles.inactiveText, { color: theme.accent.danger }]}>Inactive</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                {editingId ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Product Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter product name"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter description"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Cost Price *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={costPrice}
                    onChangeText={setCostPrice}
                    placeholder="0.00"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Selling Price *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    placeholder="0.00"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Quantity</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="0"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          { 
                            backgroundColor: category === cat ? theme.accent.primary : theme.background.secondary,
                            borderColor: category === cat ? theme.accent.primary : theme.border.light
                          }
                        ]}
                        onPress={() => setCategory(category === cat ? '' : cat)}
                      >
                        <Text style={[
                          styles.categoryText,
                          { color: category === cat ? '#fff' : theme.text.primary }
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={[styles.switchRow, { backgroundColor: theme.background.secondary }]}
                  onPress={() => setIsActive(!isActive)}
                >
                  <Text style={[styles.label, { color: theme.text.primary }]}>Active</Text>
                  <View style={[styles.switch, { backgroundColor: isActive ? theme.accent.primary : theme.text.tertiary }]}>
                    <View style={[styles.switchThumb, { backgroundColor: '#fff', transform: [{ translateX: isActive ? 20 : 0 }] }]} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={[styles.switchRow, { backgroundColor: theme.background.secondary }]}
                  onPress={() => setIsTaxExempt(!isTaxExempt)}
                >
                  <View>
                    <Text style={[styles.label, { color: theme.text.primary }]}>Tax Exempt</Text>
                    <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                      This product is exempt from tax
                    </Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: isTaxExempt ? theme.accent.primary : theme.text.tertiary }]}>
                    <View style={[styles.switchThumb, { backgroundColor: '#fff', transform: [{ translateX: isTaxExempt ? 20 : 0 }] }]} />
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.buttonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryFilter}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryFilter(false)}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.filterOption, { backgroundColor: selectedCategory === null ? theme.accent.primary : theme.background.secondary }]}
                onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryFilter(false);
                }}
              >
                <Text style={[styles.filterOptionText, { color: selectedCategory === null ? '#fff' : theme.text.primary }]}>
                  All Categories
                </Text>
              </TouchableOpacity>
              {PRODUCT_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterOption, { backgroundColor: selectedCategory === cat ? theme.accent.primary : theme.background.secondary }]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryFilter(false);
                  }}
                >
                  <Text style={[styles.filterOptionText, { color: selectedCategory === cat ? '#fff' : theme.text.primary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  productCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  productDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  productDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  inactiveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: '600',
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
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
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
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    // Styled via backgroundColor
  },
  saveButton: {
    // Styled via backgroundColor
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterOption: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  analyticsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsItem: {
    width: '47%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    gap: 12,
  },
  topProductRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  topProductMargin: {
    fontSize: 12,
  },
  topProductPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

