import { Stack, router, useLocalSearchParams } from 'expo-router';
import { FileText, Plus, Receipt, FileCheck, CheckCircle, Clock, XCircle, Send, ShoppingCart, FileSignature, Handshake, AlertCircle, Filter, X, Trash2 } from 'lucide-react-native';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert as RNAlert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '@/components/PageHeader';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAds } from '@/contexts/AdContext';
import { AdCard } from '@/components/AdCard';
import type { DocumentType, DocumentItem, DocumentStatus } from '@/types/business';
import { getDocumentTemplate } from '@/lib/document-templates-db';
import { getFilterPresets, saveFilterPreset, deleteFilterPreset } from '@/lib/filter-presets';
import type { FilterPreset } from '@/lib/filter-presets';
import DocumentWizard from '@/components/DocumentWizard';

export default function DocumentsScreen() {
  const { business, documents = [], addDocument, updateDocument, deleteDocument } = useBusiness();
  const { theme } = useTheme();
  const { getAdsForLocation } = useAds();
  const documentsAds = getAdsForLocation('documents');
  const [showWizard, setShowWizard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const params = useLocalSearchParams();

  // Ensure documents is always an array
  const safeDocuments = Array.isArray(documents) ? documents : [];

  // Check for filter type from navigation params (from dashboard)
  useEffect(() => {
    if (params?.filterType && typeof params.filterType === 'string') {
      setTypeFilter(params.filterType as DocumentType);
    }
  }, [params?.filterType]);

  // Don't early return - handle undefined theme gracefully
  // Theme should always be available from ThemeContext, but if not, use defaults

  // Template is now handled by DocumentWizard component

  // Payment reminders - overdue invoices
  const overdueInvoices = useMemo(() => {
    return safeDocuments.filter(doc => {
      if (doc.type !== 'invoice') return false;
      if (doc.status === 'paid' || doc.status === 'cancelled') return false;
      if (!doc.dueDate) return false;
      return new Date(doc.dueDate) < new Date();
    });
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    let filtered = safeDocuments;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === typeFilter);
    }

    return filtered;
  }, [safeDocuments, searchQuery, statusFilter, typeFilter]);

  // Load filter presets
  useEffect(() => {
    loadFilterPresets();
  }, []);

  const loadFilterPresets = async () => {
    const presets = await getFilterPresets();
    setFilterPresets(presets);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      RNAlert.alert('Missing Name', 'Please enter a name for this filter preset');
      return;
    }

    try {
      await saveFilterPreset({
        name: presetName.trim(),
        filters: {
          searchQuery,
          statusFilter,
          typeFilter,
        },
      });
      await loadFilterPresets();
      setShowPresetModal(false);
      setPresetName('');
      RNAlert.alert('Success', 'Filter preset saved');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save filter preset');
    }
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    const filters = preset.filters;
    if (filters.searchQuery) setSearchQuery(filters.searchQuery);
    if (filters.statusFilter) setStatusFilter(filters.statusFilter);
    if (filters.typeFilter) setTypeFilter(filters.typeFilter);
    setShowFilters(false);
    RNAlert.alert('Success', `Loaded preset: ${preset.name}`);
  };

  const handleDeletePreset = async (id: string) => {
    RNAlert.alert(
      'Delete Preset',
      'Are you sure you want to delete this filter preset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFilterPreset(id);
              await loadFilterPresets();
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete preset');
            }
          },
        },
      ]
    );
  };

  // Legacy modal functions removed - DocumentWizard handles document creation

  const handleWizardComplete = async (wizardData: {
    type: DocumentType;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    items: DocumentItem[];
    dueDate?: string;
    notes?: string;
    templateFields: Record<string, string>;
  }) => {
    if (!business) {
      RNAlert.alert('Error', 'Business profile not found');
      return;
    }

    const subtotal = wizardData.items.reduce((sum, item) => sum + item.total, 0);
    const template = await getDocumentTemplate(wizardData.type, business.type);

    // Store template fields in notes as JSON
    let notes = wizardData.notes || '';
    if (template && Object.keys(wizardData.templateFields).length > 0) {
      const templateData = {
        templateId: template.id,
        templateName: template.name,
        fields: wizardData.templateFields,
      };
      const templateJson = JSON.stringify(templateData);
      notes = notes ? `${notes}\n\n[Template Data: ${templateJson}]` : `[Template Data: ${templateJson}]`;
    }

    await addDocument({
      type: wizardData.type,
      customerName: wizardData.customerName,
      customerPhone: wizardData.customerPhone,
      customerEmail: wizardData.customerEmail,
      items: wizardData.items,
      subtotal,
      total: subtotal,
      currency: business.currency,
      date: new Date().toISOString().split('T')[0],
      dueDate: wizardData.dueDate,
      status: 'draft',
      notes: notes || undefined,
    });

    setShowWizard(false);
    RNAlert.alert('Success', `${getDocumentTypeLabel(wizardData.type)} created successfully!`);
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getIcon = (type: DocumentType) => {
    switch (type) {
      case 'invoice':
        return <FileText size={20} color="#0066CC" />;
      case 'receipt':
        return <Receipt size={20} color="#10B981" />;
      case 'quotation':
        return <FileCheck size={20} color="#F59E0B" />;
      case 'purchase_order':
        return <ShoppingCart size={20} color="#8B5CF6" />;
      case 'contract':
        return <FileSignature size={20} color="#EC4899" />;
      case 'supplier_agreement':
        return <Handshake size={20} color="#6366F1" />;
      default:
        return <FileText size={20} color="#64748B" />;
    }
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    switch (type) {
      case 'invoice':
        return 'Invoice';
      case 'receipt':
        return 'Receipt';
      case 'quotation':
        return 'Quotation';
      case 'purchase_order':
        return 'Purchase Order';
      case 'contract':
        return 'Contract';
      case 'supplier_agreement':
        return 'Supplier Agreement';
      default:
        return 'Document';
    }
  };


  const getStatusIcon = (status?: DocumentStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} color="#10B981" />;
      case 'sent':
        return <Send size={16} color="#3B82F6" />;
      case 'cancelled':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <Clock size={16} color="#94A3B8" />;
    }
  };

  const getStatusColor = (status?: DocumentStatus) => {
    switch (status) {
      case 'paid':
        return '#10B981';
      case 'sent':
        return '#3B82F6';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#94A3B8';
    }
  };

  const getStatusLabel = (status?: DocumentStatus) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'sent':
        return 'Sent';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Draft';
    }
  };

  const isOverdue = (doc: any) => {
    if (!doc.dueDate || doc.status === 'paid' || doc.status === 'cancelled') return false;
    return new Date(doc.dueDate) < new Date();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStatusChange = async (docId: string, newStatus: DocumentStatus) => {
    try {
      await updateDocument(docId, { status: newStatus });
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const handleDeleteDocument = (docId: string, docNumber: string) => {
    RNAlert.alert(
      'Delete Document',
      `Are you sure you want to delete ${docNumber}? This action cannot be undone and will also delete all associated payments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(docId);
              RNAlert.alert('Success', 'Document deleted successfully');
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme?.background?.secondary || '#F5F5F5' }]}>
        <PageHeader
          title="Documents"
          subtitle="Professional invoices, receipts & more"
          icon={FileText}
          iconGradient={['#3B82F6', '#2563EB']}
          rightAction={
            <TouchableOpacity
              style={styles.headerAddButton}
              onPress={() => setShowWizard(true)}
            >
              <Plus size={20} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          }
        />
        {/* Payment Reminders Banner */}
        {overdueInvoices.length > 0 && (
          <View style={styles.paymentReminderBanner}>
            <AlertCircle size={20} color="#EF4444" />
            <View style={styles.paymentReminderContent}>
              <Text style={styles.paymentReminderTitle}>
                {overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.paymentReminderText}>
                Total outstanding: {formatCurrency(overdueInvoices.reduce((sum, doc) => sum + doc.total, 0))}
              </Text>
            </View>
          </View>
        )}

        {/* Search and Filters */}
        <View style={[styles.searchFilterContainer, { 
          marginTop: -12,
          paddingTop: 12,
        }]}>
          <View style={[styles.searchBox, {
            backgroundColor: theme.background.card,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.05)',
          }]}>
            <FileText size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search documents..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, (statusFilter !== 'all' || typeFilter !== 'all') && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={18} color={(statusFilter !== 'all' || typeFilter !== 'all') ? '#fff' : '#64748B'} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'ios' ? 120 : 110 }]}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          {filteredDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptyDesc}>Create professional invoices, receipts, quotations, purchase orders, contracts, and supplier agreements</Text>
            </View>
          ) : (
            <>
              {filteredDocuments.map((doc, index) => {
                const overdue = isOverdue(doc);
                return (
                  <React.Fragment key={doc.id}>
                    <View 
                      style={[styles.docCard, overdue && { borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}
                    >
                      <TouchableOpacity 
                        style={styles.docCardContent}
                        onPress={() => router.push(`/document/${doc.id}` as any)}
                      >
                        <View style={styles.docHeader}>
                          <View style={styles.docLeft}>
                            <View style={styles.docIcon}>{getIcon(doc.type)}</View>
                            <View>
                              <Text style={styles.docNumber}>{doc.documentNumber}</Text>
                              <Text style={styles.docCustomer}>{doc.customerName}</Text>
                              {doc.dueDate && (
                                <Text style={[styles.docDueDate, { color: overdue ? '#EF4444' : '#64748B' }]}>
                                  Due: {formatDate(doc.dueDate)} {overdue && '⚠️'}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.docRight}>
                            <Text style={styles.docAmount}>{formatCurrency(doc.total)}</Text>
                            <View style={styles.statusRow}>
                              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(doc.status)}20` }]}>
                                {getStatusIcon(doc.status)}
                                <Text style={[styles.statusText, { color: getStatusColor(doc.status) }]}>
                                  {getStatusLabel(doc.status)}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.docDate}>{formatDate(doc.date)}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteDocument(doc.id, doc.documentNumber)}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                    {/* Show ad after every 5 documents */}
                    {documentsAds.length > 0 && (index + 1) % 5 === 0 && index < filteredDocuments.length - 1 && (
                      <AdCard 
                        key={`ad-${index}`} 
                        ad={documentsAds[Math.floor((index / 5) % documentsAds.length)]} 
                        location="documents" 
                      />
                    )}
                  </React.Fragment>
                );
              })}
              {/* Show ad at the end if there are documents */}
              {documentsAds.length > 0 && filteredDocuments.length > 0 && (
                <AdCard 
                  key="ad-end" 
                  ad={documentsAds[0]} 
                  location="documents" 
                />
              )}
            </>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.fab} onPress={() => setShowWizard(true)}>
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>

        <DocumentWizard
          visible={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
          businessType={business?.type}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 8,
  },
  docCard: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#FFF',
    marginBottom: 12,
    overflow: 'hidden',
  },
  docCardContent: {
    flex: 1,
    padding: 16,
  },
  deleteButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 1,
    borderLeftColor: '#FECACA',
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 2,
  },
  docCustomer: {
    fontSize: 13,
    color: '#64748B',
  },
  docRight: {
    alignItems: 'flex-end',
  },
  docAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0066CC',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 13,
    color: '#64748B',
  },
  docDueDate: {
    fontSize: 11,
    marginTop: 2,
  },
  statusRow: {
    marginVertical: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  typeChipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600' as const,
  },
  typeChipTextActive: {
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
  itemsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 12,
  },
  itemCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  itemInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FFF',
    color: '#0F172A',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  itemInputSmall: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FFF',
    color: '#0F172A',
  },
  itemInputPrice: {
    flex: 2,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FFF',
    color: '#0F172A',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addItemText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0066CC',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
  createButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  templateSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  templateSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 16,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectOptionActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600' as const,
  },
  selectOptionTextActive: {
    color: '#FFF',
  },
  paymentReminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: 12,
    gap: 12,
  },
  paymentReminderContent: {
    flex: 1,
  },
  paymentReminderTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#991B1B',
    marginBottom: 4,
  },
  paymentReminderText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flex: 1,
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
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
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600' as const,
  },
  filterOptionTextActive: {
    color: '#FFF',
  },
  clearFiltersButton: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
