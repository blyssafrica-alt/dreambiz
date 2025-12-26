import { router } from 'expo-router';
import { Search, X, FileText, Package, Users, Truck, DollarSign, FolderKanban, UserCircle, Clock } from 'lucide-react-native';
import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getSearchHistory, addSearchHistory, clearSearchHistory, removeSearchHistoryItem } from '@/lib/search-history';
import type { SearchHistoryItem } from '@/lib/search-history';

interface SearchResult {
  type: 'product' | 'customer' | 'supplier' | 'document' | 'transaction' | 'project' | 'employee';
  id: string;
  title: string;
  subtitle?: string;
  data: any;
}

interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ visible, onClose }: GlobalSearchProps) {
  const { 
    products, 
    customers, 
    suppliers, 
    documents, 
    transactions, 
    projects, 
    employees 
  } = useBusiness();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSearchHistory();
    }
  }, [visible]);

  const loadSearchHistory = async () => {
    const history = await getSearchHistory();
    setSearchHistory(history);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setShowHistory(text.length === 0 && searchHistory.length > 0);
  };

  const handleHistorySelect = (query: string) => {
    setSearchQuery(query);
    setShowHistory(false);
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length >= 2) {
      await addSearchHistory(searchQuery, searchResults.length);
      setShowHistory(false);
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search products
    products.forEach(product => {
      if (
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'product',
          id: product.id,
          title: product.name,
          subtitle: `${product.category} • ${product.quantity} in stock`,
          data: product,
        });
      }
    });

    // Search customers
    customers.forEach(customer => {
      if (
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.includes(query)
      ) {
        results.push({
          type: 'customer',
          id: customer.id,
          title: customer.name,
          subtitle: customer.email || customer.phone,
          data: customer,
        });
      }
    });

    // Search suppliers
    suppliers.forEach(supplier => {
      if (
        supplier.name.toLowerCase().includes(query) ||
        supplier.email?.toLowerCase().includes(query) ||
        supplier.phone?.includes(query) ||
        supplier.contactPerson?.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'supplier',
          id: supplier.id,
          title: supplier.name,
          subtitle: supplier.contactPerson || supplier.email,
          data: supplier,
        });
      }
    });

    // Search documents
    documents.forEach(doc => {
      if (
        doc.documentNumber.toLowerCase().includes(query) ||
        doc.customerName.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'document',
          id: doc.id,
          title: `${doc.documentNumber} - ${doc.customerName}`,
          subtitle: `${doc.type} • ${new Date(doc.date).toLocaleDateString()}`,
          data: doc,
        });
      }
    });

    // Search transactions
    transactions.forEach(transaction => {
      if (
        transaction.description.toLowerCase().includes(query) ||
        transaction.category.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'transaction',
          id: transaction.id,
          title: transaction.description,
          subtitle: `${transaction.type} • ${transaction.category} • ${new Date(transaction.date).toLocaleDateString()}`,
          data: transaction,
        });
      }
    });

    // Search projects
    projects.forEach(project => {
      if (
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.status?.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'project',
          id: project.id,
          title: project.name,
          subtitle: `${project.status} • ${project.progress}% complete`,
          data: project,
        });
      }
    });

    // Search employees
    employees.forEach(employee => {
      if (
        employee.name.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.position?.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'employee',
          id: employee.id,
          title: employee.name,
          subtitle: `${employee.position || employee.role || 'Employee'}`,
          data: employee,
        });
      }
    });

    return results.slice(0, 20); // Limit to 20 results
  }, [searchQuery, products, customers, suppliers, documents, transactions, projects, employees]);

  const getIcon = (type: SearchResult['type']) => {
    const iconProps = { size: 20, color: theme.text.secondary };
    switch (type) {
      case 'product':
        return <Package {...iconProps} />;
      case 'customer':
        return <Users {...iconProps} />;
      case 'supplier':
        return <Truck {...iconProps} />;
      case 'document':
        return <FileText {...iconProps} />;
      case 'transaction':
        return <DollarSign {...iconProps} />;
      case 'project':
        return <FolderKanban {...iconProps} />;
      case 'employee':
        return <UserCircle {...iconProps} />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'product': return 'Product';
      case 'customer': return 'Customer';
      case 'supplier': return 'Supplier';
      case 'document': return 'Document';
      case 'transaction': return 'Transaction';
      case 'project': return 'Project';
      case 'employee': return 'Employee';
    }
  };

  const handleResultPress = async (result: SearchResult) => {
    await addSearchHistory(searchQuery, searchResults.length);
    onClose();
    setSearchQuery('');
    
    switch (result.type) {
      case 'product':
        router.push('/(tabs)/products' as any);
        break;
      case 'customer':
        router.push('/(tabs)/customers' as any);
        break;
      case 'supplier':
        router.push('/(tabs)/suppliers' as any);
        break;
      case 'document':
        router.push(`/document/${result.id}` as any);
        break;
      case 'transaction':
        router.push('/(tabs)/finances' as any);
        break;
      case 'project':
        router.push('/(tabs)/projects' as any);
        break;
      case 'employee':
        router.push('/(tabs)/employees' as any);
        break;
    }
  };

  const groupedResults = useMemo(() => {
    const groups = new Map<SearchResult['type'], SearchResult[]>();
    searchResults.forEach(result => {
      const existing = groups.get(result.type) || [];
      groups.set(result.type, [...existing, result]);
    });
    return Array.from(groups.entries());
  }, [searchResults]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.searchBox, { backgroundColor: theme.background.secondary }]}>
              <Search size={20} color={theme.text.tertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text.primary }]}
                placeholder="Search everything..."
                placeholderTextColor={theme.text.tertiary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={20} color={theme.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.text.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Results */}
          <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
            {showHistory && searchHistory.length > 0 ? (
              <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                  <Text style={[styles.historyTitle, { color: theme.text.primary }]}>Recent Searches</Text>
                  <TouchableOpacity onPress={async () => {
                    await clearSearchHistory();
                    await loadSearchHistory();
                  }}>
                    <Text style={[styles.clearHistoryText, { color: theme.accent.primary }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
                {searchHistory.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.historyItem, { backgroundColor: theme.background.secondary }]}
                    onPress={() => handleHistorySelect(item.query)}
                  >
                    <View style={styles.historyItemLeft}>
                      <Clock size={16} color={theme.text.tertiary} />
                      <Text style={[styles.historyItemText, { color: theme.text.primary }]}>
                        {item.query}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={async () => {
                        await removeSearchHistoryItem(item.query);
                        await loadSearchHistory();
                      }}
                    >
                      <X size={16} color={theme.text.tertiary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ) : searchQuery.length < 2 ? (
              <View style={styles.emptyState}>
                <Search size={48} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                  Start typing to search...
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                  Search across products, customers, suppliers, documents, transactions, projects, and employees
                </Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Search size={48} color={theme.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                  No results found
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                  Try a different search term
                </Text>
              </View>
            ) : (
              groupedResults.map(([type, results]) => (
                <View key={type} style={styles.resultGroup}>
                  <Text style={[styles.groupTitle, { color: theme.text.secondary }]}>
                    {getTypeLabel(type)} ({results.length})
                  </Text>
                  {results.map(result => (
                    <TouchableOpacity
                      key={result.id}
                      style={[styles.resultItem, { backgroundColor: theme.background.secondary }]}
                      onPress={() => handleResultPress(result)}
                    >
                      <View style={styles.resultIcon}>
                        {getIcon(result.type)}
                      </View>
                      <View style={styles.resultContent}>
                        <Text style={[styles.resultTitle, { color: theme.text.primary }]}>
                          {result.title}
                        </Text>
                        {result.subtitle && (
                          <Text style={[styles.resultSubtitle, { color: theme.text.tertiary }]}>
                            {result.subtitle}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  container: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    padding: 20,
    paddingBottom: 40,
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
    textAlign: 'center',
  },
  resultGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
  },
  historySection: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearHistoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyItemText: {
    fontSize: 14,
    flex: 1,
  },
});

