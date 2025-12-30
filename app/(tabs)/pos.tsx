import { Stack, router } from 'expo-router';
import { 
  Plus, 
  Minus,
  ShoppingCart,
  X,
  Check,
  Search,
  Package,
  User,
  UserPlus,
  CreditCard,
  DollarSign,
  Smartphone,
  Building2,
  Trash2,
  Receipt,
  Mail,
  Printer,
  ChevronDown,
  Percent,
  Tag,
  Share2,
  FileText
} from 'lucide-react-native';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Animated,
  Modal,
  Platform,
  Dimensions,
  Linking,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Product, DocumentItem, Customer, Document } from '@/types/business';
import { exportToPDF } from '@/lib/pdf-export';
import { getCurrentEmployee } from '@/lib/get-current-employee';
import { useEmployeePermissions } from '@/hooks/useEmployeePermissions';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer';

export default function POSScreen() {
  const { business, products = [], customers = [], addDocument, updateProduct, addTransaction, addCustomer } = useBusiness();
  const { theme } = useTheme();
  const { hasPermission, isOwner, loading: permissionsLoading } = useEmployeePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<Document | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation setup
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const cartSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(cartSlideAnim, {
      toValue: cartOpen ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
  }, [cartOpen]);

  // Auto-print receipt when sale completes
  useEffect(() => {
    if (showReceiptModal && createdReceipt && business) {
      // Automatically generate and print receipt after a short delay
      const timer = setTimeout(async () => {
        try {
          setIsProcessing(true);
          await exportToPDF(createdReceipt, business);
          // Silently generate PDF - user can manually print if needed
          console.log('Receipt PDF generated automatically');
        } catch (error: any) {
          console.error('Auto-print failed:', error);
          // Don't show alert for auto-print failures, user can manually print
        } finally {
          setIsProcessing(false);
        }
      }, 500); // Small delay to ensure modal is fully rendered

      return () => clearTimeout(timer);
    }
  }, [showReceiptModal, createdReceipt, business]);

  // Don't early return - handle undefined theme gracefully
  // Theme should always be available from ThemeContext, but if not, use defaults
  // Get unique categories
  const categories = useMemo(() => {
    const cats = products
      .filter(p => p.isActive && p.quantity > 0)
      .map(p => p.category)
      .filter((cat): cat is string => !!cat);
    return ['All', ...Array.from(new Set(cats))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = (products || []).filter(p => p.isActive && p.quantity > 0);
    
    // Category filter
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!discount || parseFloat(discount) <= 0) return 0;
    if (discountType === 'percent') {
      return (cartSubtotal * parseFloat(discount)) / 100;
    }
    return Math.min(parseFloat(discount), cartSubtotal);
  }, [discount, discountType, cartSubtotal]);

  const taxAmount = useMemo(() => {
    // TODO: Get tax rate from business settings
    return 0;
  }, []);

  const cartTotal = useMemo(() => {
    return cartSubtotal - discountAmount + taxAmount;
  }, [cartSubtotal, discountAmount, taxAmount]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'cash' || !amountReceived) return 0;
    const received = parseFloat(amountReceived) || 0;
    return Math.max(0, received - cartTotal);
  }, [paymentMethod, amountReceived, cartTotal]);

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
      setCartOpen(true);
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

  const clearCart = () => {
    RNAlert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setCart([]);
            setDiscount('');
            setAmountReceived('');
            setCartOpen(false);
          },
        },
      ]
    );
  };

  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      RNAlert.alert('Required', 'Please enter customer name');
      return;
    }
    
    try {
      const newCustomer = await addCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        email: undefined,
        address: undefined,
        notes: undefined,
      });
      
      setSelectedCustomer(newCustomer);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setShowCustomerModal(false);
      RNAlert.alert('Success', 'Customer added successfully');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to add customer');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      RNAlert.alert('Empty Cart', 'Please add products to cart');
      return;
    }

    if (!selectedCustomer && !newCustomerName.trim()) {
      RNAlert.alert('Customer Required', 'Please select or enter customer name');
      return;
    }

    if (paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < cartTotal)) {
      RNAlert.alert('Insufficient Payment', `Amount received (${formatCurrency(parseFloat(amountReceived) || 0)}) is less than total (${formatCurrency(cartTotal)})`);
      return;
    }

    try {
      const customerName = selectedCustomer?.name || newCustomerName.trim();
      const customerPhone = selectedCustomer?.phone || newCustomerPhone.trim() || undefined;

      const documentItems: DocumentItem[] = cart.map((item, index) => ({
        id: `item-${index}`,
        description: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.sellingPrice,
        total: item.product.sellingPrice * item.quantity,
      }));

      // Update product stock
      for (const item of cart) {
        const newStock = item.product.quantity - item.quantity;
        await updateProduct(item.product.id, { quantity: newStock });
      }

      setIsProcessing(true);

      // Get current employee name if logged in as employee
      const currentEmployee = await getCurrentEmployee();
      const employeeName = currentEmployee?.name || undefined;

      // Create invoice/receipt with all payment details
      const newReceipt: any = await addDocument({
        type: 'receipt', // POS sales are receipts
        customerName,
        customerPhone,
        items: documentItems,
        subtotal: cartSubtotal,
        tax: taxAmount > 0 ? taxAmount : undefined,
        total: cartTotal,
        currency: business?.currency || 'USD',
        date: new Date().toISOString().split('T')[0],
        status: 'paid',
        paymentMethod: paymentMethod,
        employeeName: employeeName, // Add employee name to receipt
        notes: discountAmount > 0 
          ? `Discount: ${discountType === 'percent' ? `${discount}%` : formatCurrency(discountAmount)}`
          : undefined,
      });
      
      // Add additional fields for PDF export
      newReceipt.discountAmount = discountAmount;
      newReceipt.discountType = discountType;
      newReceipt.amountReceived = paymentMethod === 'cash' ? parseFloat(amountReceived) || 0 : cartTotal;
      newReceipt.changeAmount = changeAmount;
      newReceipt.employeeName = employeeName; // Ensure employee name is available for PDF

      // Create transaction for the sale
      try {
        await addTransaction({
          type: 'sale',
          amount: cartTotal,
          currency: business?.currency || 'USD',
          description: `POS Sale - ${customerName}`,
          category: 'sales',
          date: new Date().toISOString().split('T')[0],
        });
      } catch (error) {
        console.error('Failed to create transaction for POS sale:', error);
        // Don't fail the checkout if transaction creation fails
      }

      setIsProcessing(false);

      // Store receipt and show receipt modal
      setCreatedReceipt(newReceipt);
      setShowReceiptModal(true);
      setCartOpen(false);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to complete sale');
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { color: '#EF4444', label: 'Out of Stock' };
    if (quantity < 10) return { color: '#F59E0B', label: 'Low Stock' };
    return { color: '#10B981', label: 'In Stock' };
  };

  const handleNewSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setDiscount('');
    setAmountReceived('');
    setPaymentMethod('cash');
    setCartOpen(false);
    setCreatedReceipt(null);
  };

  const handlePrintReceipt = async () => {
    if (!createdReceipt || !business) return;

    try {
      setIsProcessing(true);
      await exportToPDF(createdReceipt, business);
      RNAlert.alert('Success', 'Receipt PDF generated. You can now print or share it.');
    } catch (error: any) {
      console.error('Print failed:', error);
      RNAlert.alert('Error', error.message || 'Failed to generate receipt for printing. Make sure expo-print is installed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailReceipt = async () => {
    if (!createdReceipt || !business) return;

    const customerEmail = selectedCustomer?.email;
    if (!customerEmail) {
      RNAlert.alert(
        'No Email',
        'Customer email not available. Please select a customer with an email address or add email in customer details.',
        [
          { text: 'OK' },
          {
            text: 'View Receipt',
            onPress: () => {
              setShowReceiptModal(false);
              handleViewReceipt();
            },
          },
        ]
      );
      return;
    }

    try {
      // Try to generate PDF and attach
      const subject = encodeURIComponent(`Receipt ${createdReceipt.documentNumber} - ${business.name}`);
      const body = encodeURIComponent(
        `Thank you for your purchase!\n\n` +
        `Receipt Number: ${createdReceipt.documentNumber}\n` +
        `Date: ${new Date(createdReceipt.date).toLocaleDateString()}\n` +
        `Total: ${formatCurrency(createdReceipt.total)}\n` +
        `Payment Method: ${createdReceipt.paymentMethod?.replace('_', ' ').toUpperCase() || 'CASH'}\n\n` +
        `Items:\n${createdReceipt.items.map(item => 
          `- ${item.description} (${item.quantity}x) = ${formatCurrency(item.total)}`
        ).join('\n')}\n\n` +
        `Generated by DreamBig Business OS`
      );

      const mailtoUrl = `mailto:${customerEmail}?subject=${subject}&body=${body}`;
      Linking.openURL(mailtoUrl).catch(() => {
        RNAlert.alert('Error', 'Could not open email client');
      });
    } catch (error: any) {
      RNAlert.alert('Error', 'Failed to prepare email');
    }
  };

  const handleShareReceipt = async () => {
    if (!createdReceipt || !business) return;

    try {
      await exportToPDF(createdReceipt, business);
      RNAlert.alert('Success', 'Receipt PDF exported successfully!');
    } catch (error: any) {
      console.error('PDF export failed:', error);
      RNAlert.alert('Error', error.message || 'Failed to export receipt as PDF. Please ensure expo-print is installed.');
    }
  };

  const handleViewReceipt = () => {
    if (!createdReceipt) return;
    setShowReceiptModal(false);
    router.push(`/document/${createdReceipt.id}` as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme?.background?.secondary || '#F5F5F5' }]}>
        <PageHeader
          title="Point of Sale"
          subtitle="Quick checkout and sales"
          icon={ShoppingCart}
          iconGradient={['#3B82F6', '#2563EB']}
        />

        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          {/* Search and Category Filter */}
          <View style={styles.searchSection}>
            <View style={[styles.searchBox, { backgroundColor: theme.background.card }]}>
              <Search size={20} color={theme.text.tertiary} />
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
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryContainer}
            >
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: selectedCategory === category || (!selectedCategory && category === 'All')
                        ? theme.accent.primary 
                        : theme.background.card,
                    }
                  ]}
                  onPress={() => setSelectedCategory(category === 'All' ? null : category)}
                >
                  <Text style={[
                    styles.categoryText,
                    { 
                      color: selectedCategory === category || (!selectedCategory && category === 'All')
                        ? '#FFF' 
                        : theme.text.primary,
                    }
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Products Grid */}
          <ScrollView 
            style={styles.productsContainer}
            contentContainerStyle={styles.productsGrid}
            showsVerticalScrollIndicator={false}
          >
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={64} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
                  No products available
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                  {searchQuery ? 'Try a different search term' : 'Add products in the Products section'}
                </Text>
              </View>
            ) : (
              filteredProducts.map(product => {
                const stockStatus = getStockStatus(product.quantity);
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productCard, { backgroundColor: theme.background.card }]}
                    onPress={() => addToCart(product)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '20' }]}>
                      <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                        {product.quantity}
                      </Text>
                    </View>
                    {product.featuredImage || (product.images && product.images.length > 0) ? (
                      <Image 
                        source={{ uri: product.featuredImage || product.images?.[0] }} 
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Package size={32} color={theme.text.tertiary} />
                      </View>
                    )}
                    <View style={styles.productInfo}>
                      <Text 
                        style={[styles.productName, { color: theme.text.primary }]}
                        numberOfLines={2}
                      >
                        {product.name}
                      </Text>
                      <Text style={[styles.productPrice, { color: theme.accent.primary }]}>
                        {formatCurrency(product.sellingPrice)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: theme.accent.primary }]}
                      onPress={() => addToCart(product)}
                    >
                      <Plus size={20} color="#FFF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </Animated.View>

        {/* Cart Button (Floating) */}
        {cart.length > 0 && (
          <TouchableOpacity
            style={[styles.cartButton, { backgroundColor: theme.accent.primary }]}
            onPress={() => setCartOpen(true)}
          >
            <View style={styles.cartButtonBadge}>
              <Text style={styles.cartButtonBadgeText}>{cart.length}</Text>
            </View>
            <ShoppingCart size={24} color="#FFF" />
            <Text style={styles.cartButtonText}>{formatCurrency(cartTotal)}</Text>
          </TouchableOpacity>
        )}

        {/* Cart Bottom Sheet */}
        <Animated.View
          style={[
            styles.cartSheet,
            {
              transform: [{ translateY: cartSlideAnim }],
            },
          ]}
        >
          <View style={[styles.cartSheetContent, { backgroundColor: theme.background.card }]}>
            {/* Cart Header */}
            <View style={styles.cartHeader}>
              <View style={styles.cartHeaderLeft}>
                <ShoppingCart size={24} color={theme.accent.primary} />
                <Text style={[styles.cartHeaderTitle, { color: theme.text.primary }]}>
                  Cart ({cart.length})
                </Text>
              </View>
              <View style={styles.cartHeaderRight}>
                {cart.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearCartButton}
                    onPress={clearCart}
                  >
                    <Trash2 size={18} color={theme.accent.danger} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeCartButton}
                  onPress={() => setCartOpen(false)}
                >
                  <X size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Customer Selection */}
            <TouchableOpacity
              style={[styles.customerSection, { backgroundColor: theme.background.secondary }]}
              onPress={() => setShowCustomerModal(true)}
            >
              <View style={styles.customerSectionLeft}>
                <User size={20} color={theme.text.secondary} />
                <View style={styles.customerInfo}>
                  <Text style={[styles.customerLabel, { color: theme.text.secondary }]}>
                    Customer
                  </Text>
                  <Text style={[styles.customerName, { color: theme.text.primary }]}>
                    {selectedCustomer?.name || newCustomerName || 'Walk-in Customer'}
                  </Text>
                </View>
              </View>
              <ChevronDown size={20} color={theme.text.tertiary} />
            </TouchableOpacity>

            {/* Cart Items */}
            <ScrollView style={styles.cartItemsList} showsVerticalScrollIndicator={false}>
              {cart.length === 0 ? (
                <View style={styles.emptyCart}>
                  <ShoppingCart size={48} color={theme.text.tertiary} />
                  <Text style={[styles.emptyCartText, { color: theme.text.tertiary }]}>
                    Cart is empty
                  </Text>
                </View>
              ) : (
                cart.map(item => (
                  <View 
                    key={item.product.id} 
                    style={[styles.cartItem, { backgroundColor: theme.background.secondary }]}
                  >
                    <View style={styles.cartItemLeft}>
                      <Text style={[styles.cartItemName, { color: theme.text.primary }]}>
                        {item.product.name}
                      </Text>
                      <Text style={[styles.cartItemPrice, { color: theme.text.secondary }]}>
                        {formatCurrency(item.product.sellingPrice)} × {item.quantity}
                      </Text>
                    </View>
                    <View style={styles.cartItemRight}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={[styles.quantityButton, { backgroundColor: theme.background.card }]}
                          onPress={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus size={16} color={theme.text.primary} />
                        </TouchableOpacity>
                        <Text style={[styles.quantityText, { color: theme.text.primary }]}>
                          {item.quantity}
                        </Text>
                        <TouchableOpacity
                          style={[styles.quantityButton, { backgroundColor: theme.background.card }]}
                          onPress={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus size={16} color={theme.text.primary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.cartItemTotal, { color: theme.accent.primary }]}>
                        {formatCurrency(item.product.sellingPrice * item.quantity)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeFromCart(item.product.id)}
                      >
                        <X size={18} color={theme.accent.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Discount Toggle */}
            {cart.length > 0 && (isOwner || hasPermission('pos:apply_discounts')) && (
              <TouchableOpacity
                style={[styles.discountToggle, { backgroundColor: theme.background.secondary }]}
                onPress={() => {
                  if (!isOwner && !hasPermission('pos:apply_discounts')) {
                    RNAlert.alert('Permission Denied', 'You do not have permission to apply discounts');
                    return;
                  }
                  setShowDiscountInput(!showDiscountInput);
                }}
              >
                <Tag size={18} color={theme.text.secondary} />
                <Text style={[styles.discountToggleText, { color: theme.text.primary }]}>
                  {discountAmount > 0 
                    ? `Discount: ${formatCurrency(discountAmount)}`
                    : 'Apply Discount'
                  }
                </Text>
                <ChevronDown 
                  size={18} 
                  color={theme.text.tertiary}
                  style={{ transform: [{ rotate: showDiscountInput ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>
            )}

            {/* Discount Input */}
            {showDiscountInput && cart.length > 0 && (isOwner || hasPermission('pos:apply_discounts')) && (
              <View style={[styles.discountInput, { backgroundColor: theme.background.secondary }]}>
                <View style={styles.discountTypeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeButton,
                      { 
                        backgroundColor: discountType === 'percent' ? theme.accent.primary : theme.background.card,
                      }
                    ]}
                    onPress={() => setDiscountType('percent')}
                  >
                    <Percent size={16} color={discountType === 'percent' ? '#FFF' : theme.text.primary} />
                    <Text style={[
                      styles.discountTypeText,
                      { color: discountType === 'percent' ? '#FFF' : theme.text.primary }
                    ]}>
                      %
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeButton,
                      { 
                        backgroundColor: discountType === 'fixed' ? theme.accent.primary : theme.background.card,
                      }
                    ]}
                    onPress={() => setDiscountType('fixed')}
                  >
                    <DollarSign size={16} color={discountType === 'fixed' ? '#FFF' : theme.text.primary} />
                    <Text style={[
                      styles.discountTypeText,
                      { color: discountType === 'fixed' ? '#FFF' : theme.text.primary }
                    ]}>
                      Fixed
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.discountInputField, { 
                    backgroundColor: theme.background.card,
                    color: theme.text.primary,
                    borderColor: theme.border.light,
                  }]}
                  placeholder={discountType === 'percent' ? 'Enter percentage' : 'Enter amount'}
                  placeholderTextColor={theme.text.tertiary}
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* Cart Summary */}
            {cart.length > 0 && (
              <View style={styles.cartSummary}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: theme.text.primary }]}>
                    {formatCurrency(cartSubtotal)}
                  </Text>
                </View>
                {discountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Discount</Text>
                    <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                      -{formatCurrency(discountAmount)}
                    </Text>
                  </View>
                )}
                {taxAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Tax</Text>
                    <Text style={[styles.summaryValue, { color: theme.text.primary }]}>
                      {formatCurrency(taxAmount)}
                    </Text>
                  </View>
                )}
                <View style={[styles.summaryDivider, { backgroundColor: theme.border.light }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryTotalLabel, { color: theme.text.primary }]}>Total</Text>
                  <Text style={[styles.summaryTotalValue, { color: theme.accent.primary }]}>
                    {formatCurrency(cartTotal)}
                  </Text>
                </View>
              </View>
            )}

            {/* Checkout Button */}
            {cart.length > 0 && (
              <TouchableOpacity
                style={[styles.checkoutButton, { backgroundColor: theme.accent.primary }]}
                onPress={() => setShowPaymentModal(true)}
              >
                <Check size={24} color="#FFF" />
                <Text style={styles.checkoutButtonText}>Proceed to Payment</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Customer Selection Modal */}
        <Modal
          visible={showCustomerModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCustomerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Select Customer</Text>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                  <X size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                <TouchableOpacity
                  style={[styles.customerOption, { backgroundColor: theme.background.secondary }]}
                  onPress={() => handleSelectCustomer(null)}
                >
                  <User size={20} color={theme.text.secondary} />
                  <Text style={[styles.customerOptionText, { color: theme.text.primary }]}>
                    Walk-in Customer
                  </Text>
                </TouchableOpacity>
                
                {customers.map(customer => (
                  <TouchableOpacity
                    key={customer.id}
                    style={[styles.customerOption, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleSelectCustomer(customer)}
                  >
                    <User size={20} color={theme.text.secondary} />
                    <View style={styles.customerOptionInfo}>
                      <Text style={[styles.customerOptionText, { color: theme.text.primary }]}>
                        {customer.name}
                      </Text>
                      {customer.phone && (
                        <Text style={[styles.customerOptionPhone, { color: theme.text.tertiary }]}>
                          {customer.phone}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

                <View style={styles.addCustomerSection}>
                  <Text style={[styles.addCustomerLabel, { color: theme.text.secondary }]}>
                    Or add new customer
                  </Text>
                  <TextInput
                    style={[styles.newCustomerInput, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    }]}
                    placeholder="Customer Name"
                    placeholderTextColor={theme.text.tertiary}
                    value={newCustomerName}
                    onChangeText={setNewCustomerName}
                  />
                  <TextInput
                    style={[styles.newCustomerInput, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    }]}
                    placeholder="Phone (Optional)"
                    placeholderTextColor={theme.text.tertiary}
                    value={newCustomerPhone}
                    onChangeText={setNewCustomerPhone}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity
                    style={[styles.addCustomerButton, { backgroundColor: theme.accent.primary }]}
                    onPress={handleAddNewCustomer}
                  >
                    <UserPlus size={18} color="#FFF" />
                    <Text style={styles.addCustomerButtonText}>Add Customer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Payment Modal */}
        <Modal
          visible={showPaymentModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Payment</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <X size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                <View style={styles.paymentTotal}>
                  <Text style={[styles.paymentTotalLabel, { color: theme.text.secondary }]}>Total Amount</Text>
                  <Text style={[styles.paymentTotalValue, { color: theme.accent.primary }]}>
                    {formatCurrency(cartTotal)}
                  </Text>
                </View>

                <Text style={[styles.paymentMethodLabel, { color: theme.text.primary }]}>
                  Payment Method
                </Text>
                
                <View style={styles.paymentMethods}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      { 
                        backgroundColor: paymentMethod === 'cash' ? theme.accent.primary + '20' : theme.background.secondary,
                        borderColor: paymentMethod === 'cash' ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => {
                      setPaymentMethod('cash');
                      setAmountReceived('');
                    }}
                  >
                    <DollarSign size={24} color={paymentMethod === 'cash' ? theme.accent.primary : theme.text.secondary} />
                    <Text style={[
                      styles.paymentMethodText,
                      { color: paymentMethod === 'cash' ? theme.accent.primary : theme.text.primary }
                    ]}>
                      Cash
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      { 
                        backgroundColor: paymentMethod === 'card' ? theme.accent.primary + '20' : theme.background.secondary,
                        borderColor: paymentMethod === 'card' ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => {
                      setPaymentMethod('card');
                      setAmountReceived('');
                    }}
                  >
                    <CreditCard size={24} color={paymentMethod === 'card' ? theme.accent.primary : theme.text.secondary} />
                    <Text style={[
                      styles.paymentMethodText,
                      { color: paymentMethod === 'card' ? theme.accent.primary : theme.text.primary }
                    ]}>
                      Card
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      { 
                        backgroundColor: paymentMethod === 'mobile_money' ? theme.accent.primary + '20' : theme.background.secondary,
                        borderColor: paymentMethod === 'mobile_money' ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => {
                      setPaymentMethod('mobile_money');
                      setAmountReceived('');
                    }}
                  >
                    <Smartphone size={24} color={paymentMethod === 'mobile_money' ? theme.accent.primary : theme.text.secondary} />
                    <Text style={[
                      styles.paymentMethodText,
                      { color: paymentMethod === 'mobile_money' ? theme.accent.primary : theme.text.primary }
                    ]}>
                      Mobile Money
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      { 
                        backgroundColor: paymentMethod === 'bank_transfer' ? theme.accent.primary + '20' : theme.background.secondary,
                        borderColor: paymentMethod === 'bank_transfer' ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => {
                      setPaymentMethod('bank_transfer');
                      setAmountReceived('');
                    }}
                  >
                    <Building2 size={24} color={paymentMethod === 'bank_transfer' ? theme.accent.primary : theme.text.secondary} />
                    <Text style={[
                      styles.paymentMethodText,
                      { color: paymentMethod === 'bank_transfer' ? theme.accent.primary : theme.text.primary }
                    ]}>
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>
                </View>

                {paymentMethod === 'cash' && (
                  <View style={styles.cashPaymentSection}>
                    <Text style={[styles.amountReceivedLabel, { color: theme.text.primary }]}>
                      Amount Received
                    </Text>
                    <TextInput
                      style={[styles.amountReceivedInput, { 
                        backgroundColor: theme.background.secondary,
                        color: theme.text.primary,
                        borderColor: theme.border.light,
                      }]}
                      placeholder="Enter amount"
                      placeholderTextColor={theme.text.tertiary}
                      value={amountReceived}
                      onChangeText={setAmountReceived}
                      keyboardType="decimal-pad"
                    />
                    {changeAmount > 0 && (
                      <View style={[styles.changeDisplay, { backgroundColor: '#10B98120' }]}>
                        <Text style={[styles.changeLabel, { color: '#10B981' }]}>Change</Text>
                        <Text style={[styles.changeValue, { color: '#10B981' }]}>
                          {formatCurrency(changeAmount)}
                        </Text>
                      </View>
                    )}
                    {amountReceived && parseFloat(amountReceived) < cartTotal && (
                      <Text style={[styles.insufficientAmount, { color: theme.accent.danger }]}>
                        Insufficient amount. Need {formatCurrency(cartTotal - parseFloat(amountReceived))} more.
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.completePaymentButton,
                    { 
                      backgroundColor: theme.accent.primary,
                      opacity: paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < cartTotal) ? 0.5 : 1,
                    }
                  ]}
                  onPress={handleCheckout}
                  disabled={paymentMethod === 'cash' && (!amountReceived || parseFloat(amountReceived) < cartTotal)}
                >
                  <Check size={24} color="#FFF" />
                  <Text style={styles.completePaymentButtonText}>
                    Complete Payment
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Receipt Modal */}
        <Modal
          visible={showReceiptModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setShowReceiptModal(false);
            handleNewSale();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.receiptModal, { backgroundColor: theme.background.card }]}>
              <View style={styles.modalHeader}>
                <View style={styles.receiptHeaderLeft}>
                  <View style={[styles.receiptIcon, { backgroundColor: '#10B98120' }]}>
                    <Receipt size={24} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Sale Complete!</Text>
                    <Text style={[styles.receiptSubtitle, { color: theme.text.secondary }]}>
                      {createdReceipt?.documentNumber}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => {
                  setShowReceiptModal(false);
                  handleNewSale();
                }}>
                  <X size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.receiptContentWrapper}>
                <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} showsVerticalScrollIndicator={false}>
                  {createdReceipt && business && (
                    <>
                      {/* Receipt Summary */}
                      <View style={[styles.receiptSummary, { backgroundColor: '#F0FDF420' }]}>
                        <View style={styles.receiptSummaryRow}>
                          <Text style={[styles.receiptSummaryLabel, { color: theme.text.secondary }]}>Total</Text>
                          <Text style={[styles.receiptSummaryValue, { color: theme.accent.primary }]}>
                            {formatCurrency(createdReceipt.total)}
                          </Text>
                        </View>
                        <View style={styles.receiptSummaryRow}>
                          <Text style={[styles.receiptSummaryLabel, { color: theme.text.secondary }]}>Payment</Text>
                          <Text style={[styles.receiptSummaryValue, { color: theme.text.primary }]}>
                            {createdReceipt.paymentMethod?.replace('_', ' ').toUpperCase() || 'CASH'}
                          </Text>
                        </View>
                        {paymentMethod === 'cash' && changeAmount > 0 && (
                          <View style={styles.receiptSummaryRow}>
                            <Text style={[styles.receiptSummaryLabel, { color: theme.text.secondary }]}>Change</Text>
                            <Text style={[styles.receiptSummaryValue, { color: '#10B981' }]}>
                              {formatCurrency(changeAmount)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Receipt Actions */}
                      <View style={styles.receiptActions}>
                        <TouchableOpacity
                          style={[styles.receiptActionButton, { backgroundColor: theme.accent.primary }]}
                          onPress={handlePrintReceipt}
                        >
                          <Printer size={20} color="#FFF" />
                          <Text style={styles.receiptActionText}>Print Receipt</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.receiptActionButton, { backgroundColor: theme.accent.success }]}
                          onPress={handleEmailReceipt}
                          disabled={!selectedCustomer?.email && !newCustomerPhone}
                        >
                          <Mail size={20} color="#FFF" />
                          <Text style={styles.receiptActionText}>Email Receipt</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.receiptActionButton, { backgroundColor: theme.background.secondary, borderWidth: 1, borderColor: theme.border.light }]}
                          onPress={handleShareReceipt}
                        >
                          <Share2 size={20} color={theme.text.primary} />
                          <Text style={[styles.receiptActionText, { color: theme.text.primary }]}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.receiptActionButton, { backgroundColor: theme.background.secondary, borderWidth: 1, borderColor: theme.border.light }]}
                          onPress={handleViewReceipt}
                        >
                          <FileText size={20} color={theme.text.primary} />
                          <Text style={[styles.receiptActionText, { color: theme.text.primary }]}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>

              {/* New Sale Button */}
              <View style={styles.receiptFooter}>
                <TouchableOpacity
                  style={[styles.newSaleButton, { backgroundColor: theme.accent.primary }]}
                  onPress={() => {
                    setShowReceiptModal(false);
                    handleNewSale();
                  }}
                >
                  <ShoppingCart size={20} color="#FFF" />
                  <Text style={styles.newSaleButtonText}>New Sale</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoryScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryContainer: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  productsContainer: {
    flex: 1,
  },
  productsGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 100,
  },
  productCard: {
    width: (Dimensions.get('window').width - 44) / 2,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  stockBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  productInfo: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 6,
    minHeight: 40,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cartButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  cartButtonBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cartButtonBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  cartButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  cartSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.85,
    zIndex: 100,
  },
  cartSheetContent: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartHeaderTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  cartHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearCartButton: {
    padding: 8,
  },
  closeCartButton: {
    padding: 4,
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  customerSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customerInfo: {
    flex: 1,
  },
  customerLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cartItemsList: {
    flex: 1,
    marginBottom: 16,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyCartText: {
    fontSize: 16,
    marginTop: 12,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cartItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 13,
  },
  cartItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700' as const,
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    minWidth: 70,
    textAlign: 'right',
  },
  removeButton: {
    padding: 4,
  },
  discountToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  discountToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  discountInput: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  discountTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  discountTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  discountTypeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  discountInputField: {
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  cartSummary: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    width: '100%',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
    fontSize: 24,
    fontWeight: '800' as const,
  },
  receiptContentWrapper: {
    flex: 1,
    minHeight: 300,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  customerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  customerOptionInfo: {
    flex: 1,
  },
  customerOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  customerOptionPhone: {
    fontSize: 13,
  },
  addCustomerSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  addCustomerLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  newCustomerInput: {
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  addCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  addCustomerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  paymentTotal: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 24,
  },
  paymentTotalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  paymentTotalValue: {
    fontSize: 32,
    fontWeight: '800' as const,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  paymentMethodButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cashPaymentSection: {
    marginBottom: 24,
  },
  amountReceivedLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  amountReceivedInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '700' as const,
    borderWidth: 2,
    marginBottom: 12,
  },
  changeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  changeValue: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  insufficientAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  completePaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
    marginTop: 8,
  },
  completePaymentButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  receiptModal: {
    maxHeight: '90%',
    minHeight: '70%',
    flex: 1,
  },
  receiptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  receiptIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  receiptSummary: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  receiptSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptSummaryLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  receiptSummaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  receiptActions: {
    gap: 12,
    marginBottom: 20,
  },
  receiptActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  receiptActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  receiptFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  newSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
  },
  newSaleButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
});
