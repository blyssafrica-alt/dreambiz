import { Stack, router, useLocalSearchParams } from 'expo-router';
import { FileText, Plus, Receipt, FileCheck, CheckCircle, Clock, XCircle, Send, ShoppingCart, FileSignature, Handshake, AlertCircle, Filter, X, Trash2, Folder, FolderOpen, Settings, Edit, MoreVertical } from 'lucide-react-native';
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
  Modal,
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
  const { business, documents = [], folders = [], addDocument, updateDocument, deleteDocument, addFolder, updateFolder, deleteFolder, loadFolders } = useBusiness();
  const { theme } = useTheme();
  const { getAdsForLocation } = useAds();
  const documentsAds = getAdsForLocation('documents');
  const [showWizard, setShowWizard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [folderFilter, setFolderFilter] = useState<string | 'all'>('all');
  const [currentView, setCurrentView] = useState<'documents' | 'folders'>('documents');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#0066CC');
  const params = useLocalSearchParams();

  // Ensure documents is always an array
  const safeDocuments = Array.isArray(documents) ? documents : [];

  // Check for filter type or view from navigation params (from dashboard)
  useEffect(() => {
    if (params?.filterType && typeof params.filterType === 'string') {
      setTypeFilter(params.filterType as DocumentType);
      setCurrentView('documents');
    }
    if (params?.view && typeof params.view === 'string' && params.view === 'folders') {
      setCurrentView('folders');
    }
  }, [params?.filterType, params?.view]);

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

    // Folder filter
    if (folderFilter !== 'all') {
      filtered = filtered.filter(doc => doc.folderId === folderFilter);
    }

    return filtered;
  }, [safeDocuments, searchQuery, statusFilter, typeFilter, folderFilter]);

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
    folderId?: string;
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
      folderId: wizardData.folderId,
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

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, currentView === 'documents' && styles.viewToggleButtonActive]}
            onPress={() => setCurrentView('documents')}
          >
            <FileText size={16} color={currentView === 'documents' ? '#fff' : '#64748B'} />
            <Text style={[styles.viewToggleText, currentView === 'documents' && styles.viewToggleTextActive]}>
              Documents
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, currentView === 'folders' && styles.viewToggleButtonActive]}
            onPress={() => setCurrentView('folders')}
          >
            <Folder size={16} color={currentView === 'folders' ? '#fff' : '#64748B'} />
            <Text style={[styles.viewToggleText, currentView === 'folders' && styles.viewToggleTextActive]}>
              Folders
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'ios' ? 120 : 110 }]}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          {currentView === 'folders' ? (
            // Folders View
            <>
              <View style={styles.foldersGrid}>
                {/* "All Documents" folder */}
                <TouchableOpacity
                  style={[styles.folderCard, folderFilter === 'all' && styles.folderCardActive]}
                  onPress={() => {
                    setFolderFilter('all');
                    setCurrentView('documents');
                  }}
                >
                  <View style={[styles.folderIcon, { backgroundColor: '#94A3B820' }]}>
                    <FolderOpen size={32} color="#94A3B8" />
                  </View>
                  <Text style={[styles.folderName, folderFilter === 'all' && styles.folderNameActive]}>
                    All Documents
                  </Text>
                  <Text style={styles.folderCount}>{safeDocuments.length} documents</Text>
                </TouchableOpacity>

                {/* User-created folders */}
                {folders.map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.folderCard, folderFilter === folder.id && styles.folderCardActive]}
                    onPress={() => {
                      setFolderFilter(folder.id);
                      setCurrentView('documents');
                    }}
                  >
                    <View style={[styles.folderIcon, { backgroundColor: `${folder.color}20` }]}>
                      <Folder size={32} color={folder.color} />
                    </View>
                    <Text style={[styles.folderName, folderFilter === folder.id && styles.folderNameActive]}>
                      {folder.name}
                    </Text>
                    <Text style={styles.folderCount}>{folder.documentCount || 0} documents</Text>
                    <TouchableOpacity
                      style={styles.folderMenu}
                      onPress={() => {
                        setEditingFolder(folder);
                        setFolderName(folder.name);
                        setFolderColor(folder.color);
                        setShowFolderModal(true);
                      }}
                    >
                      <MoreVertical size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}

                {/* Add Folder Button */}
                <TouchableOpacity
                  style={styles.addFolderCard}
                  onPress={() => {
                    setEditingFolder(null);
                    setFolderName('');
                    setFolderColor('#0066CC');
                    setShowFolderModal(true);
                  }}
                >
                  <Plus size={32} color="#94A3B8" />
                  <Text style={styles.addFolderText}>Add Folder</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : filteredDocuments.length === 0 ? (
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
          folders={folders}
          selectedFolderId={folderFilter !== 'all' ? folderFilter : undefined}
        />

        {/* Folder Management Modal */}
        <Modal
          visible={showFolderModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFolderModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                  {editingFolder ? 'Edit Folder' : 'Create Folder'}
                </Text>
                <TouchableOpacity onPress={() => setShowFolderModal(false)}>
                  <X size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.modalLabel, { color: theme.text.secondary }]}>Folder Name</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  placeholder="Enter folder name"
                  placeholderTextColor={theme.text.tertiary}
                  value={folderName}
                  onChangeText={setFolderName}
                  autoFocus
                />

                <Text style={[styles.modalLabel, { color: theme.text.secondary, marginTop: 16 }]}>Color</Text>
                <View style={styles.colorPicker}>
                  {['#0066CC', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1', '#EF4444', '#14B8A6'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        folderColor === color && styles.colorOptionActive,
                      ]}
                      onPress={() => setFolderColor(color)}
                    />
                  ))}
                </View>

                <View style={styles.modalActions}>
                  {editingFolder && (
                    <TouchableOpacity
                      style={[styles.modalButton, styles.deleteButton, { backgroundColor: '#EF444420' }]}
                      onPress={async () => {
                        try {
                          await deleteFolder(editingFolder.id);
                          setShowFolderModal(false);
                          setEditingFolder(null);
                          setFolderName('');
                          await loadFolders();
                          RNAlert.alert('Success', 'Folder deleted successfully');
                        } catch (error: any) {
                          RNAlert.alert('Error', error.message || 'Failed to delete folder');
                        }
                      }}
                    >
                      <Trash2 size={18} color="#EF4444" />
                      <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                    onPress={() => {
                      setShowFolderModal(false);
                      setEditingFolder(null);
                      setFolderName('');
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.text.secondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.accent.primary }]}
                    onPress={async () => {
                      if (!folderName.trim()) {
                        RNAlert.alert('Missing Name', 'Please enter a folder name');
                        return;
                      }
                      try {
                        if (editingFolder) {
                          await updateFolder(editingFolder.id, {
                            name: folderName.trim(),
                            color: folderColor,
                            displayOrder: editingFolder.displayOrder,
                          });
                          RNAlert.alert('Success', 'Folder updated successfully');
                        } else {
                          await addFolder({
                            name: folderName.trim(),
                            color: folderColor,
                            displayOrder: folders.length,
                          });
                          RNAlert.alert('Success', 'Folder created successfully');
                        }
                        await loadFolders();
                        setShowFolderModal(false);
                        setEditingFolder(null);
                        setFolderName('');
                      } catch (error: any) {
                        RNAlert.alert('Error', error.message || 'Failed to save folder');
                      }
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                      {editingFolder ? 'Save' : 'Create'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </RNAlert.Modal>
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
  viewToggle: {
    flexDirection: 'row',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 8,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  viewToggleButtonActive: {
    backgroundColor: '#0066CC',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  viewToggleTextActive: {
    color: '#fff',
  },
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  folderCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  folderCardActive: {
    borderColor: '#0066CC',
    backgroundColor: '#F0F7FF',
  },
  folderIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  folderName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  folderNameActive: {
    color: '#0066CC',
  },
  folderCount: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  folderMenu: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  addFolderCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    gap: 8,
  },
  addFolderText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748B',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#0F172A',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#EF444420',
  },
  cancelButton: {
    backgroundColor: '#F8FAFC',
  },
  saveButton: {
    backgroundColor: '#0066CC',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
