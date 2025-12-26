import { Stack } from 'expo-router';
import { 
  Plus, 
  Minus,
  ShoppingCart,
  X,
  Check,
  Search,
  Package
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
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Product, DocumentItem } from '@/types/business';

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POSScreen() {
  const { business, products, addDocument } = useBusiness();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products.filter(p => p.isActive && p.quantity > 0);
    return products.filter(p => 
      p.isActive && 
      p.quantity > 0 &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.category?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        RNAlert.alert('Insufficient Stock', `Only ${product.quantity} units available`);
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return null;
        if (newQuantity > item.product.quantity) {
          RNAlert.alert('Insufficient Stock', `Only ${item.product.quantity} units available`);
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      RNAlert.alert('Empty Cart', 'Please add products to cart');
      return;
    }

    if (!customerName.trim()) {
      RNAlert.alert('Customer Required', 'Please enter customer name');
      return;
    }

    try {
      const documentItems: DocumentItem[] = cart.map((item, index) => ({
        id: `item-${index}`,
        description: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        total: item.product.sellingPrice * item.quantity,
      }));

      const subtotal = cartTotal;
      const documentNumber = `INV-${Date.now().toString().slice(-6)}`;

      await addDocument({
        type: 'invoice',
        customerName: customerName.trim(),
        items: documentItems,
        subtotal,
        total: subtotal,
        currency: business?.currency || 'USD',
        date: new Date().toISOString().split('T')[0],
        status: 'paid',
      });

      RNAlert.alert('Success', 'Sale completed successfully', [
        {
          text: 'OK',
          onPress: () => {
            setCart([]);
            setCustomerName('');
            setSearchQuery('');
          },
        },
      ]);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to complete sale');
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen options={{ title: 'Point of Sale', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Point of Sale</Text>
      </View>

      <View style={styles.content}>
        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={[styles.searchBox, { backgroundColor: theme.background.card }]}>
            <Search size={20} color={theme.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search products..."
              placeholderTextColor={theme.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView style={styles.productsList}>
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={48} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                  No products available
                </Text>
              </View>
            ) : (
              filteredProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, { backgroundColor: theme.background.card }]}
                  onPress={() => addToCart(product)}
                >
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: theme.text.primary }]}>
                      {product.name}
                    </Text>
                    <Text style={[styles.productPrice, { color: theme.accent.primary }]}>
                      {formatCurrency(product.sellingPrice)}
                    </Text>
                    <Text style={[styles.productStock, { color: theme.text.tertiary }]}>
                      Stock: {product.quantity}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
                    onPress={() => addToCart(product)}
                  >
                    <Plus size={20} color="#FFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Cart Section */}
        <View style={[styles.cartSection, { backgroundColor: theme.background.card }]}>
          <View style={styles.cartHeader}>
            <ShoppingCart size={20} color={theme.text.primary} />
            <Text style={[styles.cartTitle, { color: theme.text.primary }]}>
              Cart ({cart.length})
            </Text>
          </View>

          <View style={styles.customerInput}>
            <TextInput
              style={[styles.customerInputField, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
              placeholder="Customer Name"
              placeholderTextColor={theme.text.tertiary}
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <ScrollView style={styles.cartItems}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={[styles.emptyCartText, { color: theme.text.tertiary }]}>
                  Cart is empty
                </Text>
              </View>
            ) : (
              cart.map(item => (
                <View key={item.product.id} style={[styles.cartItem, { backgroundColor: theme.background.secondary }]}>
                  <View style={styles.cartItemInfo}>
                    <Text style={[styles.cartItemName, { color: theme.text.primary }]}>
                      {item.product.name}
                    </Text>
                    <Text style={[styles.cartItemPrice, { color: theme.text.secondary }]}>
                      {formatCurrency(item.product.sellingPrice)} × {item.quantity}
                    </Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus size={16} color={theme.text.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.quantityText, { color: theme.text.primary }]}>
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus size={16} color={theme.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromCart(item.product.id)}
                    >
                      <X size={16} color={theme.accent.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.cartFooter}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.text.primary }]}>Total:</Text>
              <Text style={[styles.totalAmount, { color: theme.accent.primary }]}>
                {formatCurrency(cartTotal)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, { backgroundColor: theme.accent.primary }]}
              onPress={handleCheckout}
              disabled={cart.length === 0}
            >
              <Check size={20} color="#FFF" />
              <Text style={styles.checkoutButtonText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  productsSection: {
    flex: 1,
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  productsList: {
    flex: 1,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 12,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartSection: {
    width: 350,
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  customerInput: {
    marginBottom: 16,
  },
  customerInputField: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  cartItems: {
    flex: 1,
    marginBottom: 16,
  },
  emptyCart: {
    alignItems: 'center',
    padding: 40,
  },
  emptyCartText: {
    fontSize: 14,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 12,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
});

