import { Stack, router } from 'expo-router';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Trash2,
  Filter,
  X,
  Download,
  Edit2,
  Search,
  Camera,
  ArrowRight
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
  Modal,
  Share,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SALES_CATEGORIES, EXPENSE_CATEGORIES } from '@/constants/categories';
import type { Currency, TransactionType } from '@/types/business';

export default function FinancesScreen() {
  const { business, transactions, addTransaction, updateTransaction, deleteTransaction } = useBusiness();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('sale');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'expense'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    return filtered;
  }, [transactions, filterType, searchQuery, dateFilter, categoryFilter]);

  const categoryOptions = type === 'sale' ? SALES_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSave = async () => {
    if (!amount || !description || !category) {
      RNAlert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }

    if (editingId) {
      await updateTransaction(editingId, {
        type,
        amount: parseFloat(amount),
        description,
        category,
      });
    } else {
      await addTransaction({
        type,
        amount: parseFloat(amount),
        currency: business?.currency || 'USD',
        description,
        category,
        date: new Date().toISOString().split('T')[0],
      });
    }

    setAmount('');
    setDescription('');
    setCategory('');
    setEditingId(null);
    setShowModal(false);
  };

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id);
    setType(transaction.type);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description);
    setCategory(transaction.category);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setAmount('');
    setDescription('');
    setCategory('');
  };

  const handleDelete = (id: string) => {
    RNAlert.alert(
      'Delete Transaction',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) },
      ]
    );
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const symbol = currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleExport = async () => {
    if (transactions.length === 0) {
      RNAlert.alert('No Data', 'No transactions to export');
      return;
    }

    const csvHeader = 'Date,Type,Category,Description,Amount,Currency\n';
    const csvRows = transactions.map(t => 
      `${t.date},${t.type},${t.category},"${t.description}",${t.amount},${t.currency}`
    ).join('\n');
    const csvContent = csvHeader + csvRows;

    const summary = `\n\nSUMMARY\n` +
      `Total Transactions: ${transactions.length}\n` +
      `Total Sales: ${formatCurrency(transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0), business?.currency || 'USD')}\n` +
      `Total Expenses: ${formatCurrency(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0), business?.currency || 'USD')}`;

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv' } as any);
        const url = URL.createObjectURL(blob);
        const doc = (typeof globalThis !== 'undefined' && (globalThis as any).document) as any;
        if (!doc) throw new Error('Document not available');
        const a = doc.createElement('a');
        a.href = url;
        a.download = `dreambig-transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csvContent + summary,
          title: 'DreamBig Transactions Export',
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
      RNAlert.alert('Export Failed', 'Could not export transactions');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <LinearGradient
            colors={theme.gradient.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Finances</Text>
              <Text style={styles.headerSubtitle}>
                Track sales, expenses, and profit
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} 
                onPress={handleExport}
              >
                <Download size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} 
                onPress={() => setShowFilterModal(true)}
              >
                <Filter size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Search and Filters */}
        <Animated.View style={[styles.searchFilterContainer, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }]}>
          <View style={[styles.searchBox, { 
            backgroundColor: theme.background.card,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }]}>
            <Search size={18} color={theme.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text.primary }]}
              placeholder="Search transactions..."
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
        </Animated.View>

        {/* Active Filters */}
        {(filterType !== 'all' || dateFilter !== 'all' || categoryFilter || searchQuery) && (
          <View style={styles.activeFiltersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
              {filterType !== 'all' && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {filterType === 'sale' ? 'Sales' : 'Expenses'}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterType('all')}>
                    <X size={14} color="#0066CC" />
                  </TouchableOpacity>
                </View>
              )}
              {dateFilter !== 'all' && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{dateFilter}</Text>
                  <TouchableOpacity onPress={() => setDateFilter('all')}>
                    <X size={14} color="#0066CC" />
                  </TouchableOpacity>
                </View>
              )}
              {categoryFilter && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{categoryFilter}</Text>
                  <TouchableOpacity onPress={() => setCategoryFilter(null)}>
                    <X size={14} color="#0066CC" />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'ios' ? 140 : 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          }}>
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <TrendingUp size={48} color={theme.text.tertiary} />
                <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>No transactions yet</Text>
                <Text style={[styles.emptyDesc, { color: theme.text.secondary }]}>Start tracking your sales and expenses</Text>
              </View>
            ) : (
              filteredTransactions.map((transaction) => (
                <Animated.View key={transaction.id} style={[styles.transactionCard, { 
                  backgroundColor: theme.background.card,
                  transform: [{ scale: scaleAnim }],
                }]}>
                  <View style={styles.transactionLeft}>
                  <LinearGradient
                    colors={transaction.type === 'sale' ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                    style={styles.typeIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {transaction.type === 'sale' ? (
                      <TrendingUp size={20} color="#FFF" strokeWidth={2.5} />
                    ) : (
                      <TrendingDown size={20} color="#FFF" strokeWidth={2.5} />
                    )}
                  </LinearGradient>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDesc}>{transaction.description}</Text>
                    <Text style={styles.transactionMeta}>
                      {transaction.category} • {formatDate(transaction.date)}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    transaction.type === 'sale' ? styles.amountSale : styles.amountExpense
                  ]}>
                    {transaction.type === 'sale' ? '+' : '-'}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(transaction)}
                    >
                      <Edit2 size={16} color="#0066CC" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(transaction.id)}
                    >
                      <Trash2 size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            ))
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.fabContainer}>
          <TouchableOpacity 
            style={[styles.fab, styles.fabSecondary]} 
            onPress={() => router.push('/receipt-scan' as any)}
          >
            <Camera size={20} color="#0066CC" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
            <Plus size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <Modal visible={showModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Transaction' : 'Add Transaction'}</Text>

              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'sale' && styles.typeButtonActive]}
                  onPress={() => setType('sale')}
                >
                  <TrendingUp size={20} color={type === 'sale' ? '#FFF' : '#10B981'} />
                  <Text style={[styles.typeButtonText, type === 'sale' && styles.typeButtonTextActive]}>
                    Sale
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
                  onPress={() => setType('expense')}
                >
                  <TrendingDown size={20} color={type === 'expense' ? '#FFF' : '#EF4444'} />
                  <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount ({business?.currency})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What was this for?"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categoryOptions.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        category === cat && styles.categoryChipActive,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={styles.input}
                  placeholder="Or type custom category"
                  value={category}
                  onChangeText={setCategory}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={handleSave}>
                  <Text style={styles.addButtonText}>{editingId ? 'Save' : 'Add'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showFilterModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.filterModalContent}>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'all' && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setFilterType('all');
                  setShowFilterModal(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'all' && styles.filterOptionTextActive,
                ]}>
                  All Transactions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'sale' && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setFilterType('sale');
                  setShowFilterModal(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'sale' && styles.filterOptionTextActive,
                ]}>
                  Sales Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filterType === 'expense' && styles.filterOptionActive,
                ]}
                onPress={() => {
                  setFilterType('expense');
                  setShowFilterModal(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  filterType === 'expense' && styles.filterOptionTextActive,
                ]}>
                  Expenses Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
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
  content: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 16,
    marginTop: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  typeIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 14,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  typeButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#334155',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#0F172A',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  addButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#0066CC',
    marginBottom: 16,
  },
  filterBadgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0066CC',
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  searchFilterContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  activeFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    margin: 20,
  },
  filterOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  filterOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0066CC',
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#334155',
    textAlign: 'center',
  },
  filterOptionTextActive: {
    color: '#0066CC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  filterScroll: {
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#334155',
    marginBottom: 12,
  },
  clearFiltersButton: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
});
