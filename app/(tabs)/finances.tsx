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
  DollarSign,
  Calendar,
  ChevronDown
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
import PageHeader from '@/components/PageHeader';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { SALES_CATEGORIES, EXPENSE_CATEGORIES } from '@/constants/categories';
import type { Currency, TransactionType } from '@/types/business';

export default function FinancesScreen() {
  const { business, transactions, addTransaction, updateTransaction, deleteTransaction } = useBusiness();
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
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

  // Ensure transactions is always an array
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

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

  const filteredTransactions = useMemo(() => {
    let filtered = safeTransactions;

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

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [safeTransactions, filterType, searchQuery, dateFilter, categoryFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const sales = filteredTransactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { sales, expenses, profit: sales - expenses };
  }, [filteredTransactions]);

  const categoryOptions = type === 'sale' ? SALES_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSave = async () => {
    if (!amount || !description || !category) {
      RNAlert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }

    try {
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
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save transaction');
    }
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
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) },
      ]
    );
  };

  const formatCurrency = (amount: number, currency: Currency = business?.currency || 'USD') => {
    const symbol = currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-ZW', { month: 'short', day: 'numeric' });
    }
  };

  const handleExport = async () => {
    if (safeTransactions.length === 0) {
      RNAlert.alert('No Data', 'No transactions to export');
      return;
    }

    const csvHeader = 'Date,Type,Category,Description,Amount,Currency\n';
    const csvRows = safeTransactions.map(t => 
      `${t.date},${t.type},${t.category},"${t.description}",${t.amount},${t.currency}`
    ).join('\n');
    const csvContent = csvHeader + csvRows;

    const summary = `\n\nSUMMARY\n` +
      `Total Transactions: ${safeTransactions.length}\n` +
      `Total Sales: ${formatCurrency(safeTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0))}\n` +
      `Total Expenses: ${formatCurrency(safeTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))}`;

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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (dateFilter !== 'all') count++;
    if (categoryFilter) count++;
    if (searchQuery) count++;
    return count;
  }, [filterType, dateFilter, categoryFilter, searchQuery]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <PageHeader
          title="Finances"
          subtitle="Track sales, expenses, and profit"
          icon={DollarSign}
          iconGradient={['#10B981', '#059669']}
          rightAction={
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]} 
                onPress={handleExport}
              >
                <Download size={20} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.headerButton, 
                  { 
                    backgroundColor: activeFiltersCount > 0 ? '#FFF' : 'rgba(255, 255, 255, 0.2)',
                  }
                ]} 
                onPress={() => setShowFilterModal(true)}
              >
                <Filter size={20} color={activeFiltersCount > 0 ? '#0066CC' : '#FFF'} strokeWidth={2.5} />
                {activeFiltersCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          }
        />

        {/* Summary Cards */}
        {filteredTransactions.length > 0 && (
          <Animated.View style={[styles.summaryContainer, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryScroll}
            >
              <View style={[styles.summaryCard, { backgroundColor: '#10B98120', borderColor: '#10B98140' }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#10B981' }]}>
                  <TrendingUp size={20} color="#FFF" />
                </View>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Sales</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  {formatCurrency(totals.sales)}
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
                <View style={[styles.summaryIcon, { backgroundColor: '#EF4444' }]}>
                  <TrendingDown size={20} color="#FFF" />
                </View>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Expenses</Text>
                <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                  {formatCurrency(totals.expenses)}
                </Text>
              </View>

              <View style={[styles.summaryCard, { 
                backgroundColor: totals.profit >= 0 ? '#10B98120' : '#EF444420',
                borderColor: totals.profit >= 0 ? '#10B98140' : '#EF444440'
              }]}>
                <View style={[styles.summaryIcon, { backgroundColor: totals.profit >= 0 ? '#10B981' : '#EF4444' }]}>
                  <DollarSign size={20} color="#FFF" />
                </View>
                <Text style={[styles.summaryLabel, { color: theme.text.secondary }]}>Profit</Text>
                <Text style={[styles.summaryValue, { 
                  color: totals.profit >= 0 ? '#10B981' : '#EF4444' 
                }]}>
                  {formatCurrency(totals.profit)}
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Search Bar */}
        <Animated.View style={[styles.searchContainer, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }]}>
          <View style={[styles.searchBox, { backgroundColor: theme.background.card }]}>
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
        {(filterType !== 'all' || dateFilter !== 'all' || categoryFilter) && (
          <View style={styles.activeFiltersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
              {filterType !== 'all' && (
                <View style={[styles.filterChip, { backgroundColor: theme.accent.primary + '20' }]}>
                  <Text style={[styles.filterChipText, { color: theme.accent.primary }]}>
                    {filterType === 'sale' ? 'Sales' : 'Expenses'}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterType('all')}>
                    <X size={14} color={theme.accent.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {dateFilter !== 'all' && (
                <View style={[styles.filterChip, { backgroundColor: theme.accent.primary + '20' }]}>
                  <Text style={[styles.filterChipText, { color: theme.accent.primary }]}>
                    {dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}
                  </Text>
                  <TouchableOpacity onPress={() => setDateFilter('all')}>
                    <X size={14} color={theme.accent.primary} />
                  </TouchableOpacity>
                </View>
              )}
              {categoryFilter && (
                <View style={[styles.filterChip, { backgroundColor: theme.accent.primary + '20' }]}>
                  <Text style={[styles.filterChipText, { color: theme.accent.primary }]}>
                    {categoryFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setCategoryFilter(null)}>
                    <X size={14} color={theme.accent.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Transactions List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'ios' ? 140 : 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}>
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.background.card }]}>
                  <TrendingUp size={48} color={theme.text.tertiary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>
                  No transactions yet
                </Text>
                <Text style={[styles.emptyDesc, { color: theme.text.secondary }]}>
                  Start tracking your sales and expenses
                </Text>
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: theme.accent.primary }]}
                  onPress={() => setShowModal(true)}
                >
                  <Plus size={20} color="#FFF" />
                  <Text style={styles.emptyButtonText}>Add Transaction</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredTransactions.map((transaction) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={[styles.transactionCard, { backgroundColor: theme.background.card }]}
                  activeOpacity={0.7}
                  onPress={() => handleEdit(transaction)}
                >
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
                      <Text style={[styles.transactionDesc, { color: theme.text.primary }]}>
                        {transaction.description}
                      </Text>
                      <View style={styles.transactionMeta}>
                        <Text style={[styles.transactionMetaText, { color: theme.text.secondary }]}>
                          {transaction.category}
                        </Text>
                        <Text style={[styles.transactionMetaDot, { color: theme.text.tertiary }]}>
                          {' • '}
                        </Text>
                        <Text style={[styles.transactionMetaText, { color: theme.text.secondary }]}>
                          {formatDate(transaction.date)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'sale' ? '#10B981' : '#EF4444' }
                    ]}>
                      {transaction.type === 'sale' ? '+' : '-'}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </Text>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleEdit(transaction);
                        }}
                      >
                        <Edit2 size={16} color={theme.accent.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(transaction.id);
                        }}
                      >
                        <Trash2 size={16} color={theme.accent.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </Animated.View>
        </ScrollView>

        {/* FAB */}
        <View style={styles.fabContainer}>
          <TouchableOpacity 
            style={[styles.fabSecondary, { 
              backgroundColor: theme.background.card,
              borderColor: theme.accent.primary,
            }]} 
            onPress={() => router.push('/receipt-scan' as any)}
          >
            <Camera size={20} color={theme.accent.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.fab, { backgroundColor: theme.accent.primary }]} 
            onPress={() => setShowModal(true)}
          >
            <Plus size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Add/Edit Transaction Modal */}
        <Modal visible={showModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                  {editingId ? 'Edit Transaction' : 'Add Transaction'}
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <X size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      { 
                        backgroundColor: type === 'sale' ? theme.accent.success : theme.background.secondary,
                        borderColor: type === 'sale' ? theme.accent.success : theme.border.light,
                      }
                    ]}
                    onPress={() => setType('sale')}
                  >
                    <TrendingUp size={20} color={type === 'sale' ? '#FFF' : theme.accent.success} />
                    <Text style={[
                      styles.typeButtonText,
                      { color: type === 'sale' ? '#FFF' : theme.text.primary }
                    ]}>
                      Sale
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      { 
                        backgroundColor: type === 'expense' ? theme.accent.danger : theme.background.secondary,
                        borderColor: type === 'expense' ? theme.accent.danger : theme.border.light,
                      }
                    ]}
                    onPress={() => setType('expense')}
                  >
                    <TrendingDown size={20} color={type === 'expense' ? '#FFF' : theme.accent.danger} />
                    <Text style={[
                      styles.typeButtonText,
                      { color: type === 'expense' ? '#FFF' : theme.text.primary }
                    ]}>
                      Expense
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>
                    Amount ({business?.currency || 'USD'})
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.text.tertiary}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Description</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    }]}
                    placeholder="What was this for?"
                    placeholderTextColor={theme.text.tertiary}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {categoryOptions.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          { 
                            backgroundColor: category === cat ? theme.accent.primary : theme.background.secondary,
                            borderColor: category === cat ? theme.accent.primary : theme.border.light,
                          }
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          { color: category === cat ? '#FFF' : theme.text.primary }
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                      marginTop: 12,
                    }]}
                    placeholder="Or type custom category"
                    placeholderTextColor={theme.text.tertiary}
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { 
                      backgroundColor: theme.background.secondary,
                      borderColor: theme.border.light,
                    }]}
                    onPress={handleCloseModal}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: theme.accent.primary }]} 
                    onPress={handleSave}
                  >
                    <Text style={styles.addButtonText}>{editingId ? 'Save' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Filter Modal */}
        <Modal visible={showFilterModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.filterModalContent, { backgroundColor: theme.background.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Filter Transactions</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <X size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: theme.text.primary }]}>Type</Text>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: filterType === 'all' ? theme.accent.primary + '20' : theme.background.secondary,
                        borderColor: filterType === 'all' ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => setFilterType('all')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: filterType === 'all' ? theme.accent.primary : theme.text.primary }
                    ]}>
                      All Transactions
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: filterType === 'sale' ? theme.accent.primary + '20' : theme.background.secondary,
                        borderColor: filterType === 'sale' ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => setFilterType('sale')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: filterType === 'sale' ? theme.accent.primary : theme.text.primary }
                    ]}>
                      Sales Only
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: filterType === 'expense' ? theme.accent.primary + '20' : theme.background.secondary,
                        borderColor: filterType === 'expense' ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => setFilterType('expense')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: filterType === 'expense' ? theme.accent.primary : theme.text.primary }
                    ]}>
                      Expenses Only
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: theme.text.primary }]}>Date</Text>
                  {(['all', 'today', 'week', 'month'] as const).map((filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.filterOption,
                        { 
                          backgroundColor: dateFilter === filter ? theme.accent.primary + '20' : theme.background.secondary,
                          borderColor: dateFilter === filter ? theme.accent.primary : theme.border.light,
                        }
                      ]}
                      onPress={() => setDateFilter(filter)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        { color: dateFilter === filter ? theme.accent.primary : theme.text.primary }
                      ]}>
                        {filter === 'all' ? 'All Time' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: theme.text.primary }]}>Category</Text>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: !categoryFilter ? theme.accent.primary + '20' : theme.background.secondary,
                        borderColor: !categoryFilter ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => setCategoryFilter(null)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      { color: !categoryFilter ? theme.accent.primary : theme.text.primary }
                    ]}>
                      All Categories
                    </Text>
                  </TouchableOpacity>
                  {[...SALES_CATEGORIES, ...EXPENSE_CATEGORIES]
                    .filter((cat, index, self) => self.indexOf(cat) === index)
                    .map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.filterOption,
                          { 
                            backgroundColor: categoryFilter === cat ? theme.accent.primary + '20' : theme.background.secondary,
                            borderColor: categoryFilter === cat ? theme.accent.primary : theme.border.light,
                          }
                        ]}
                        onPress={() => setCategoryFilter(cat)}
                      >
                        <Text style={[
                          styles.filterOptionText,
                          { color: categoryFilter === cat ? theme.accent.primary : theme.text.primary }
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                  style={[styles.clearFiltersButton, { backgroundColor: theme.background.secondary }]}
                  onPress={() => {
                    setFilterType('all');
                    setDateFilter('all');
                    setCategoryFilter(null);
                    setSearchQuery('');
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[styles.clearFiltersText, { color: theme.accent.danger }]}>
                    Clear All Filters
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  summaryContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  summaryScroll: {
    gap: 12,
  },
  summaryCard: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  searchContainer: {
    padding: 16,
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
  activeFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  activeFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  content: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    shadowRadius: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionMetaText: {
    fontSize: 13,
  },
  transactionMetaDot: {
    fontSize: 13,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
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
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  addButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  filterModalContent: {
    borderRadius: 24,
    padding: 24,
    margin: 20,
    maxHeight: '80%',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  clearFiltersButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
