import { Stack, useLocalSearchParams } from 'expo-router';
import { Share as ShareIcon, Mail, FileDown, Trash2, X, QrCode, Link as LinkIcon, Edit2, Save, Plus, Check, DollarSign, CreditCard, Smartphone, Building2 } from 'lucide-react-native';
import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert as RNAlert,
  Platform,
  Share,
  Linking,
  Modal,
  Image,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Document, DocumentItem, DocumentStatus } from '@/types/business';
import { getDocumentTemplate, generateDocumentContent } from '@/lib/document-templates';
import { exportToPDF } from '@/lib/pdf-export';
import { generateQRCodeData, generatePaymentLink, generateQRCodePattern } from '@/lib/qr-code';
import type { Payment } from '@/types/payments';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { documents, business, getDocumentPayments, getDocumentPaidAmount, deletePayment, updateDocument, addPayment, addTransaction } = useBusiness();
  const { theme } = useTheme();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  
  // Edit mode state
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTax, setEditTax] = useState('');
  const [editItems, setEditItems] = useState<DocumentItem[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<DocumentStatus>('draft');
  
  // Payment modal state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other'>('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  const document = documents.find(d => d.id === id) as Document | undefined;
  
  const template = business && document 
    ? getDocumentTemplate(document.type, business.type)
    : null;

  const documentPayments = document ? getDocumentPayments(document.id) : [];
  const paidAmount = document ? getDocumentPaidAmount(document.id) : 0;
  const outstandingAmount = document ? document.total - paidAmount : 0;

  // Initialize edit state when entering edit mode
  const enterEditMode = () => {
    if (!document) return;
    setEditCustomerName(document.customerName);
    setEditCustomerPhone(document.customerPhone || '');
    setEditCustomerEmail(document.customerEmail || '');
    setEditCustomerAddress(''); // Will be added to Document type if needed
    setEditDate(document.date);
    setEditDueDate(document.dueDate || '');
    setEditTax(document.tax?.toString() || '');
    setEditItems([...document.items]);
    setEditNotes(document.notes || '');
    setEditStatus(document.status || 'draft');
    setIsEditMode(true);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditCustomerName('');
    setEditCustomerPhone('');
    setEditCustomerEmail('');
    setEditCustomerAddress('');
    setEditDate('');
    setEditDueDate('');
    setEditTax('');
    setEditItems([]);
    setEditNotes('');
  };

  const handleSaveDocument = async () => {
    if (!document) return;

    try {
      // Recalculate totals from edited items
      const newSubtotal = editItems.reduce((sum, item) => sum + item.total, 0);
      const tax = editTax ? parseFloat(editTax) : 0;
      const newTotal = newSubtotal + tax;

      // Check if status changed to 'paid' - if so, create transaction
      const wasPaid = document.status === 'paid';
      const isNowPaid = editStatus === 'paid';
      const statusChangedToPaid = !wasPaid && isNowPaid;

      await updateDocument(document.id, {
        customerName: editCustomerName,
        customerPhone: editCustomerPhone || undefined,
        customerEmail: editCustomerEmail || undefined,
        items: editItems,
        subtotal: newSubtotal,
        tax: tax > 0 ? tax : undefined,
        total: newTotal,
        date: editDate,
        dueDate: editDueDate || undefined,
        notes: editNotes || undefined,
        status: editStatus,
      });

      // If status changed to paid and it's an invoice/receipt, create transaction
      if (statusChangedToPaid && (document.type === 'invoice' || document.type === 'receipt')) {
        try {
          await addTransaction({
            type: 'sale',
            amount: newTotal,
            currency: document.currency,
            description: `${document.type.toUpperCase()} ${document.documentNumber} - ${editCustomerName}`,
            category: 'sales',
            date: editDate || document.date,
          });
        } catch (error) {
          console.error('Failed to create transaction for paid document:', error);
          // Don't fail the document update if transaction creation fails
        }
      }

      RNAlert.alert('Success', 'Document updated successfully');
      exitEditMode();
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to update document');
    }
  };

  const handleAddItem = () => {
    const newItem: DocumentItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setEditItems([...editItems, newItem]);
  };

  const handleUpdateItem = (itemId: string, field: keyof DocumentItem, value: any) => {
    setEditItems(editItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleDeleteItem = (itemId: string) => {
    setEditItems(editItems.filter(item => item.id !== itemId));
  };

  const handleAddPayment = async () => {
    if (!document || !paymentAmount) {
      RNAlert.alert('Missing Fields', 'Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      RNAlert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (amount > outstandingAmount) {
      RNAlert.alert('Invalid Amount', `Amount cannot exceed outstanding balance of ${formatCurrency(outstandingAmount)}`);
      return;
    }

    try {
      await addPayment({
        documentId: document.id,
        amount,
        currency: document.currency,
        paymentDate,
        paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });

      // Reset form
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setShowPaymentModal(false);
      
      RNAlert.alert('Success', 'Payment recorded successfully');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to add payment');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!document) return;

    try {
      const remainingAmount = outstandingAmount;
      if (remainingAmount > 0) {
        // Add a payment for the remaining amount
        await addPayment({
          documentId: document.id,
          amount: remainingAmount,
          currency: document.currency,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          notes: 'Marked as paid manually',
        });
      }

      await updateDocument(document.id, { status: 'paid' });
      
      // Create transaction for paid invoice/receipt
      if (document.type === 'invoice' || document.type === 'receipt') {
        try {
          await addTransaction({
            type: 'sale',
            amount: document.total,
            currency: document.currency,
            description: `${document.type.toUpperCase()} ${document.documentNumber} - ${document.customerName}`,
            category: 'sales',
            date: document.date,
          });
        } catch (error) {
          console.error('Failed to create transaction:', error);
        }
      }
      
      setShowMarkPaidModal(false);
      RNAlert.alert('Success', 'Invoice marked as paid');
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to mark as paid');
    }
  };

  if (!document) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Document not found</Text>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    const symbol = document.currency === 'USD' ? '$' : 'ZWL';
    return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZW', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleShare = async () => {
    if (!document || !business) return;
    
    try {
      await exportToPDF(document, business);
      RNAlert.alert('Success', 'Document PDF exported successfully!');
    } catch (error: any) {
      console.error('PDF export failed:', error);
      RNAlert.alert('Error', error.message || 'Failed to export document as PDF. Please ensure expo-print is installed.');
    }
  };

  // handleExportPDF is now the same as handleShare (both export as PDF)
  const handleExportPDF = handleShare;

  const handleEmail = () => {
    if (!document.customerEmail) {
      RNAlert.alert('No Email', 'Customer email not available');
      return;
    }

    const subject = encodeURIComponent(`${document.documentNumber} - ${business?.name}`);
    const body = encodeURIComponent(
      template && business
        ? generateDocumentContent(document, business, template)
        : 'Please find attached document.'
    );

    const mailtoUrl = `mailto:${document.customerEmail}?subject=${subject}&body=${body}`;
    Linking.openURL(mailtoUrl).catch(() => {
      RNAlert.alert('Error', 'Could not open email client');
    });
  };

  const handleDeletePayment = (paymentId: string) => {
    RNAlert.alert(
      'Delete Payment',
      'Are you sure you want to delete this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayment(paymentId);
            } catch (error: any) {
              RNAlert.alert('Error', error.message || 'Failed to delete payment');
            }
          },
        },
      ]
    );
  };

  const docTypeLabel = document.type.charAt(0).toUpperCase() + document.type.slice(1).replace('_', ' ');

  // Parse template fields from notes
  let templateFieldsData: Record<string, string> = {};
  let notesOnly = document.notes || '';
  if (document.notes) {
    try {
      const notesMatch = document.notes.match(/\[Template Data: (.+)\]/);
      if (notesMatch) {
        const templateData = JSON.parse(notesMatch[1]);
        templateFieldsData = templateData.fields || {};
        notesOnly = document.notes.replace(/\[Template Data: .+\]/, '').trim();
      }
    } catch {
      // Not JSON, treat as regular notes
    }
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: document.documentNumber,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12, marginRight: 16 }}>
              {isEditMode ? (
                <>
                  <TouchableOpacity onPress={exitEditMode}>
                    <X size={22} color={theme.accent.danger} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveDocument}>
                    <Save size={22} color={theme.accent.success} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={enterEditMode}>
                    <Edit2 size={22} color={theme.accent.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleExportPDF}>
                    <FileDown size={22} color={theme.accent.primary} />
                  </TouchableOpacity>
                  {document.customerEmail && (
                    <TouchableOpacity onPress={handleEmail}>
                      <Mail size={22} color={theme.accent.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleShare}>
                    <ShareIcon size={22} color={theme.accent.primary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )
        }} 
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Professional Document Header */}
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <LinearGradient
            colors={template ? [template.styling.primaryColor, template.styling.primaryColor + 'DD'] : ['#0066CC', '#0052A3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.documentHeader}
          >
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                {business?.logo ? (
                  <Image source={{ uri: business.logo }} style={styles.logo} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>{business?.name?.charAt(0) || 'B'}</Text>
                  </View>
                )}
              </View>
              <View style={styles.headerRight}>
                {isEditMode ? (
                  <TextInput
                    style={[styles.editDateInput, { backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFF' }]}
                    value={editDate}
                    onChangeText={setEditDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                  />
                ) : (
                  <>
                    <Text style={styles.headerDate}>{new Date(document.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</Text>
                    <Text style={styles.headerTime}>{new Date(document.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.headerBottom}>
              <View style={styles.docTypeContainer}>
                <View style={styles.docTypeBadge}>
                  <Text style={styles.docTypeText}>
                    {docTypeLabel.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.docNumberLarge}>{document.documentNumber}</Text>
              </View>
            </View>
          </LinearGradient>
        </SafeAreaView>

        {/* FROM and TO Sections - Side by Side */}
        <View style={styles.fromToSection}>
          <View style={styles.fromToCard}>
            <Text style={styles.fromToLabel}>FROM</Text>
            <Text style={styles.fromToName}>{business?.name}</Text>
            {business?.phone && <Text style={styles.fromToDetail}>{business.phone}</Text>}
            {business?.location && <Text style={styles.fromToDetail}>{business.location}</Text>}
            {business?.email && <Text style={styles.fromToDetail}>{business.email}</Text>}
          </View>
          <View style={styles.fromToCard}>
            <Text style={styles.fromToLabel}>
              {document.type === 'purchase_order' || document.type === 'supplier_agreement' ? 'SUPPLIER' : 'TO'}
            </Text>
            {isEditMode ? (
              <>
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={editCustomerName}
                  onChangeText={setEditCustomerName}
                  placeholder="Customer Name"
                  placeholderTextColor={theme.text.tertiary}
                />
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={editCustomerPhone}
                  onChangeText={setEditCustomerPhone}
                  placeholder="Phone"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={editCustomerEmail}
                  onChangeText={setEditCustomerEmail}
                  placeholder="Email"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={editCustomerAddress}
                  onChangeText={setEditCustomerAddress}
                  placeholder="Address"
                  placeholderTextColor={theme.text.tertiary}
                  multiline
                />
              </>
            ) : (
              <>
                <Text style={styles.fromToName}>{document.customerName}</Text>
                {document.customerPhone && <Text style={styles.fromToDetail}>{document.customerPhone}</Text>}
                {document.customerEmail && <Text style={styles.fromToDetail}>{document.customerEmail}</Text>}
              </>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>ITEMS</Text>
            {isEditMode && (
              <TouchableOpacity
                style={[styles.addItemButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleAddItem}
              >
                <Plus size={18} color="#FFF" />
                <Text style={styles.addItemButtonText}>Add Item</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Unit Price</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
              {isEditMode && <Text style={[styles.tableHeaderText, { flex: 0.5 }]}></Text>}
            </View>
            {(isEditMode ? editItems : document.items).map((item, index) => (
              <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                {isEditMode ? (
                  <>
                    <TextInput
                      style={[styles.editItemInput, { flex: 3, backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={item.description}
                      onChangeText={(value) => handleUpdateItem(item.id, 'description', value)}
                      placeholder="Description"
                    />
                    <TextInput
                      style={[styles.editItemInput, { flex: 1, backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={item.quantity.toString()}
                      onChangeText={(value) => handleUpdateItem(item.id, 'quantity', parseInt(value) || 0)}
                      keyboardType="numeric"
                      placeholder="Qty"
                    />
                    <TextInput
                      style={[styles.editItemInput, { flex: 1.5, backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                      value={item.unitPrice.toString()}
                      onChangeText={(value) => handleUpdateItem(item.id, 'unitPrice', parseFloat(value) || 0)}
                      keyboardType="decimal-pad"
                      placeholder="Price"
                    />
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: '700', color: template?.styling.primaryColor || '#0066CC' }]}>
                      {formatCurrency(item.total)}
                    </Text>
                    <TouchableOpacity
                      style={[styles.deleteItemButton, { flex: 0.5 }]}
                      onPress={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 size={16} color={theme.accent.danger} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tableCell, { flex: 3, fontWeight: '600' }]}>{item.description}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(item.unitPrice)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: '700', color: template?.styling.primaryColor || '#0066CC' }]}>{formatCurrency(item.total)}</Text>
                  </>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                {isEditMode ? formatCurrency(editItems.reduce((sum, item) => sum + item.total, 0)) : formatCurrency(document.subtotal)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              {isEditMode ? (
                <TextInput
                  style={[styles.editTaxInput, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={editTax}
                  onChangeText={setEditTax}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
              ) : (
                <Text style={styles.totalValue}>{document.tax ? formatCurrency(document.tax) : formatCurrency(0)}</Text>
              )}
            </View>
            {document.dueDate && !isEditMode && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Due Date</Text>
                <Text style={styles.totalValue}>{new Date(document.dueDate).toLocaleDateString()}</Text>
              </View>
            )}
            {isEditMode && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Due Date</Text>
                <TextInput
                  style={[styles.editDateInputSmall, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.text.tertiary}
                />
              </View>
            )}
            <View style={styles.totalDivider} />
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total</Text>
              <Text style={[styles.totalValueFinal, { color: template?.styling.primaryColor || '#10B981' }]}>
                {formatCurrency(document.total)}
              </Text>
            </View>
            {document.type === 'invoice' && (
              <>
                <View style={styles.totalDivider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Paid</Text>
                  <Text style={[styles.totalValue, { color: '#10B981' }]}>{formatCurrency(paidAmount)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: outstandingAmount > 0 ? '#EF4444' : '#10B981', fontWeight: '700' }]}>
                    Outstanding
                  </Text>
                  <Text style={[styles.totalValue, { color: outstandingAmount > 0 ? '#EF4444' : '#10B981', fontWeight: '700' }]}>
                    {formatCurrency(outstandingAmount)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Template-specific fields - Professional Display */}
        {template && Object.keys(templateFieldsData).length > 0 && (
          <View style={styles.templateFieldsSection}>
            <View style={[styles.templateFieldsHeader, { backgroundColor: (template.styling.primaryColor || '#6366F1') + '15' }]}>
              <Text style={[styles.templateFieldsTitle, { color: template.styling.primaryColor || '#6366F1' }]}>
                {docTypeLabel.toUpperCase()} SPECIFIC FIELDS
              </Text>
            </View>
            <View style={styles.templateFieldsContent}>
              {Object.entries(templateFieldsData).map(([key, value]) => {
                const field = template.fields.find(f => f.id === key);
                if (!field || !value || String(value).trim() === '') return null;
                return (
                  <View key={key} style={styles.templateFieldRow}>
                    <Text style={styles.templateFieldLabel}>{field.label}</Text>
                    <Text style={styles.templateFieldValue}>{String(value)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Notes</Text>
          {isEditMode ? (
            <TextInput
              style={[styles.editNotesInput, { 
                backgroundColor: theme.background.secondary,
                color: theme.text.primary,
                borderColor: theme.border.light,
              }]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Add notes..."
              placeholderTextColor={theme.text.tertiary}
              multiline
              numberOfLines={4}
            />
          ) : (
            notesOnly ? (
              <Text style={styles.notesText}>{notesOnly}</Text>
            ) : (
              <Text style={[styles.notesText, { color: theme.text.tertiary, fontStyle: 'italic' }]}>
                No notes
              </Text>
            )
          )}
        </View>

        {/* Status Section (Edit Mode) */}
        {isEditMode && (
          <View style={styles.statusSection}>
            <Text style={[styles.statusLabel, { color: theme.text.primary }]}>Status</Text>
            <View style={styles.statusButtons}>
              {(['draft', 'sent', 'paid', 'cancelled'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    { 
                      backgroundColor: editStatus === status ? theme.accent.primary : theme.background.secondary,
                      borderColor: editStatus === status ? theme.accent.primary : theme.border.light,
                    }
                  ]}
                  onPress={() => setEditStatus(status)}
                >
                  <Text style={[
                    styles.statusButtonText,
                    { color: editStatus === status ? '#FFF' : theme.text.primary }
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Payment History */}
        {document.type === 'invoice' && (
          <View style={styles.paymentsSection}>
            <View style={styles.paymentsHeader}>
              <Text style={styles.paymentsTitle}>Payment History</Text>
              <View style={styles.paymentActions}>
                {outstandingAmount > 0 && (
                  <>
                    <TouchableOpacity
                      style={[styles.addPaymentButton, { backgroundColor: theme.accent.primary }]}
                      onPress={() => setShowPaymentModal(true)}
                    >
                      <Plus size={16} color="#FFF" />
                      <Text style={styles.addPaymentButtonText}>Add Payment</Text>
                    </TouchableOpacity>
                    {document.status !== 'paid' && (
                      <TouchableOpacity
                        style={[styles.markPaidButton, { backgroundColor: theme.accent.success }]}
                        onPress={() => setShowMarkPaidModal(true)}
                      >
                        <Check size={16} color="#FFF" />
                        <Text style={styles.markPaidButtonText}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
            {documentPayments.length === 0 ? (
              <View style={styles.noPaymentsContainer}>
                <Text style={styles.noPaymentsText}>No payments recorded yet</Text>
                {outstandingAmount > 0 && (
                  <TouchableOpacity
                    style={[styles.addPaymentButtonSmall, { backgroundColor: theme.accent.primary }]}
                    onPress={() => setShowPaymentModal(true)}
                  >
                    <Plus size={16} color="#FFF" />
                    <Text style={styles.addPaymentButtonText}>Add Payment</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              documentPayments.map(payment => (
                <View key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentRow}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                      <Text style={styles.paymentMethod}>{payment.paymentMethod.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentDate}>{new Date(payment.paymentDate).toLocaleDateString()}</Text>
                      <TouchableOpacity onPress={() => handleDeletePayment(payment.id)}>
                        <Trash2 size={16} color={theme.accent.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {payment.reference && (
                    <Text style={styles.paymentReference}>Ref: {payment.reference}</Text>
                  )}
                  {payment.notes && (
                    <Text style={styles.paymentNotes}>{payment.notes}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.accent.primary }]} 
            onPress={handleExportPDF}
          >
            <FileDown size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Export PDF</Text>
          </TouchableOpacity>
          {document.customerEmail && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.emailButton, { backgroundColor: theme.accent.success }]} 
              onPress={handleEmail}
            >
              <Mail size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton, { backgroundColor: theme.text.secondary }]} 
            onPress={handleShare}
          >
            <ShareIcon size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          {document.type === 'invoice' && outstandingAmount > 0 && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.accent.success }]} 
                onPress={() => setShowQRModal(true)}
              >
                <QrCode size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.accent.primary }]} 
                onPress={() => setShowPaymentLinkModal(true)}
              >
                <LinkIcon size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Payment Link</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Payment QR Code</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.qrContainer}>
                <Text style={[styles.qrTitle, { color: theme.text.primary }]}>
                  Scan to Pay
                </Text>
                <Text style={[styles.qrAmount, { color: theme.accent.primary }]}>
                  {formatCurrency(outstandingAmount)}
                </Text>
                {document && business && (
                  <Image
                    source={{ uri: generateQRCodePattern(generateQRCodeData({
                      documentId: document.id,
                      amount: outstandingAmount,
                      currency: document.currency,
                      customerName: document.customerName,
                    })) }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                )}
                <Text style={[styles.qrHint, { color: theme.text.tertiary }]}>
                  Customer can scan this QR code to make payment
                </Text>
                <TouchableOpacity
                  style={[styles.qrButton, { backgroundColor: theme.accent.primary }]}
                  onPress={async () => {
                    if (document) {
                      await Share.share({
                        message: `Payment QR Code for Invoice ${document.documentNumber}\nAmount: ${formatCurrency(outstandingAmount)}\nScan the QR code to pay.`,
                        title: 'Payment QR Code',
                      });
                    }
                  }}
                >
                  <ShareIcon size={20} color="#FFF" />
                  <Text style={styles.qrButtonText}>Share QR Code</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Link Modal */}
      <Modal
        visible={showPaymentLinkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentLinkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Payment Link</Text>
              <TouchableOpacity onPress={() => setShowPaymentLinkModal(false)}>
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.paymentLinkContainer}>
                <Text style={[styles.paymentLinkTitle, { color: theme.text.primary }]}>
                  Shareable Payment Link
                </Text>
                <Text style={[styles.paymentLinkAmount, { color: theme.accent.primary }]}>
                  {formatCurrency(outstandingAmount)}
                </Text>
                {document && (
                  <>
                    <View style={[styles.linkBox, { backgroundColor: theme.background.secondary }]}>
                      <Text style={[styles.linkText, { color: theme.text.primary }]} selectable>
                        {generatePaymentLink(document.id)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.linkButton, { backgroundColor: theme.accent.primary }]}
                      onPress={async () => {
                        if (document) {
                          const link = generatePaymentLink(document.id);
                          await Share.share({
                            message: `Pay Invoice ${document.documentNumber}\nAmount: ${formatCurrency(outstandingAmount)}\n\nPayment Link: ${link}`,
                            title: 'Payment Link',
                            url: link,
                          });
                        }
                      }}
                    >
                      <ShareIcon size={20} color="#FFF" />
                      <Text style={styles.linkButtonText}>Share Payment Link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.linkButton, styles.copyButton, { backgroundColor: theme.background.secondary }]}
                      onPress={() => {
                        if (document) {
                          RNAlert.alert('Copied', 'Payment link copied to clipboard');
                        }
                      }}
                    >
                      <Text style={[styles.linkButtonText, { color: theme.text.primary }]}>Copy Link</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Add Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.paymentInfoBox}>
                <Text style={[styles.paymentInfoLabel, { color: theme.text.secondary }]}>Outstanding Amount</Text>
                <Text style={[styles.paymentInfoValue, { color: theme.accent.primary }]}>
                  {formatCurrency(outstandingAmount)}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>
                  Amount ({document.currency}) *
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
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Payment Method *</Text>
                <View style={styles.paymentMethodsGrid}>
                  {(['cash', 'card', 'mobile_money', 'bank_transfer', 'other'] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodOption,
                        { 
                          backgroundColor: paymentMethod === method ? theme.accent.primary + '20' : theme.background.secondary,
                          borderColor: paymentMethod === method ? theme.accent.primary : theme.border.light,
                        }
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      {method === 'cash' && <DollarSign size={20} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      {method === 'card' && <CreditCard size={20} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      {method === 'mobile_money' && <Smartphone size={20} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      {method === 'bank_transfer' && <Building2 size={20} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      {method === 'other' && <DollarSign size={20} color={paymentMethod === method ? theme.accent.primary : theme.text.secondary} />}
                      <Text style={[
                        styles.paymentMethodOptionText,
                        { color: paymentMethod === method ? theme.accent.primary : theme.text.primary }
                      ]}>
                        {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Payment Date</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.background.secondary,
                    color: theme.text.primary,
                    borderColor: theme.border.light,
                  }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.text.tertiary}
                  value={paymentDate}
                  onChangeText={setPaymentDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Reference Number</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.background.secondary,
                    color: theme.text.primary,
                    borderColor: theme.border.light,
                  }]}
                  placeholder="Optional"
                  placeholderTextColor={theme.text.tertiary}
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.primary }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { 
                    backgroundColor: theme.background.secondary,
                    color: theme.text.primary,
                    borderColor: theme.border.light,
                  }]}
                  placeholder="Optional notes"
                  placeholderTextColor={theme.text.tertiary}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.cancelButton, { 
                    backgroundColor: theme.background.secondary,
                    borderColor: theme.border.light,
                  }]}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                  onPress={handleAddPayment}
                >
                  <Check size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>Add Payment</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mark as Paid Modal */}
      <Modal
        visible={showMarkPaidModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMarkPaidModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.confirmTitle, { color: theme.text.primary }]}>
              Mark Invoice as Paid
            </Text>
            <Text style={[styles.confirmMessage, { color: theme.text.secondary }]}>
              This will record a payment of {formatCurrency(outstandingAmount)} and mark the invoice as fully paid.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmCancelButton, { 
                  backgroundColor: theme.background.secondary,
                  borderColor: theme.border.light,
                }]}
                onPress={() => setShowMarkPaidModal(false)}
              >
                <Text style={[styles.confirmCancelText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.accent.success }]}
                onPress={handleMarkAsPaid}
              >
                <Check size={20} color="#FFF" />
                <Text style={styles.confirmButtonText}>Mark as Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  content: {
    padding: 0,
    paddingBottom: 40,
  },
  // Professional Document Header
  documentHeader: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#FFF',
    padding: 8,
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFF',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  headerTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerBottom: {
    marginTop: 12,
  },
  docTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  docTypeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 1,
  },
  docNumberLarge: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: 1,
  },
  // FROM/TO Section
  fromToSection: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  fromToCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fromToLabel: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  fromToName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 8,
  },
  fromToDetail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  // Items Section
  itemsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  itemsTitle: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  itemsTable: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowEven: {
    backgroundColor: '#FAFBFC',
  },
  tableCell: {
    fontSize: 14,
    color: '#0F172A',
  },
  // Totals Section
  totalsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  totalsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0F172A',
  },
  totalValueFinal: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  // Template Fields Section
  templateFieldsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  templateFieldsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  templateFieldsTitle: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
  templateFieldsContent: {
    backgroundColor: '#FFF',
    padding: 16,
  },
  templateFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  templateFieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748B',
    flex: 1,
  },
  templateFieldValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  // Notes Section
  notesSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notesText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 22,
  },
  // Payment History
  paymentsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  paymentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0F172A',
  },
  paymentCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#10B981',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentDate: {
    fontSize: 13,
    color: '#64748B',
  },
  paymentReference: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noPaymentsText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  emailButton: {
    backgroundColor: '#10B981',
  },
  shareButton: {
    backgroundColor: '#0066CC',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
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
    fontWeight: '700' as const,
  },
  modalBody: {
    padding: 20,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  qrAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
  },
  qrHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  paymentLinkContainer: {
    alignItems: 'center',
    padding: 20,
  },
  paymentLinkTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  paymentLinkAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 20,
  },
  linkBox: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
  },
  linkButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  copyButton: {
    marginBottom: 0,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
  // Edit Mode Styles
  editInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    marginTop: 4,
  },
  editDateInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    borderColor: 'rgba(255,255,255,0.3)',
    color: '#FFF',
    minWidth: 120,
  },
  editDateInputSmall: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    flex: 1,
  },
  editTaxInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    width: 100,
    textAlign: 'right',
  },
  editItemInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    borderColor: '#E2E8F0',
  },
  deleteItemButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addItemButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  editNotesInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  statusSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  // Payment Management Styles
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPaymentButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markPaidButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  noPaymentsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  addPaymentButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  paymentNotes: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  paymentInfoBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B98140',
    marginBottom: 20,
    alignItems: 'center',
  },
  paymentInfoLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  paymentInfoValue: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  paymentMethodOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentMethodOptionText: {
    fontSize: 13,
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
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
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
  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  confirmModal: {
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
