import { Stack, useLocalSearchParams } from 'expo-router';
import { Share as ShareIcon, Mail, FileDown, Trash2, X, QrCode, Link as LinkIcon } from 'lucide-react-native';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Document } from '@/types/business';
import { getDocumentTemplate, generateDocumentContent } from '@/lib/document-templates';
import { exportToPDF } from '@/lib/pdf-export';
import { generateQRCodeData, generatePaymentLink, generateQRCodePattern } from '@/lib/qr-code';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams();
  const { documents, business, getDocumentPayments, getDocumentPaidAmount, deletePayment } = useBusiness();
  const { theme } = useTheme();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  
  const document = documents.find(d => d.id === id) as Document | undefined;
  
  const template = business && document 
    ? getDocumentTemplate(document.type, business.type)
    : null;

  const documentPayments = document ? getDocumentPayments(document.id) : [];
  const paidAmount = document ? getDocumentPaidAmount(document.id) : 0;
  const outstandingAmount = document ? document.total - paidAmount : 0;

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
    
    const content = template
      ? generateDocumentContent(document, business, template)
      : generateDocumentContent(document, business, getDocumentTemplate(document.type, 'other'));

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const doc = (typeof globalThis !== 'undefined' && (globalThis as any).document) as any;
        if (!doc) throw new Error('Document not available');
        const a = doc.createElement('a');
        a.href = url;
        a.download = `${document.documentNumber}-${document.customerName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: content,
          title: `${document.type.charAt(0).toUpperCase() + document.type.slice(1)} ${document.documentNumber}`,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      RNAlert.alert('Error', 'Failed to share document');
    }
  };

  const handleExportPDF = async () => {
    if (!document || !business) return;
    
    try {
      await exportToPDF(document, business);
      RNAlert.alert('Success', 'PDF exported successfully');
    } catch (error: any) {
      console.error('PDF export failed:', error);
      RNAlert.alert('Error', error.message || 'Failed to export PDF. Make sure expo-print is installed.');
    }
  };

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
                <Text style={styles.headerDate}>{new Date(document.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</Text>
                <Text style={styles.headerTime}>{new Date(document.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
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
            <Text style={styles.fromToName}>{document.customerName}</Text>
            {document.customerPhone && <Text style={styles.fromToDetail}>{document.customerPhone}</Text>}
            {document.customerEmail && <Text style={styles.fromToDetail}>{document.customerEmail}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>ITEMS</Text>
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Unit Price</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
            </View>
            {document.items.map((item, index) => (
              <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                <Text style={[styles.tableCell, { flex: 3, fontWeight: '600' }]}>{item.description}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', fontWeight: '700', color: template?.styling.primaryColor || '#0066CC' }]}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(document.subtotal)}</Text>
            </View>
            {document.tax && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>{formatCurrency(document.tax)}</Text>
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
        {notesOnly && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{notesOnly}</Text>
          </View>
        )}

        {/* Payment History */}
        {document.type === 'invoice' && (
          <View style={styles.paymentsSection}>
            <View style={styles.paymentsHeader}>
              <Text style={styles.paymentsTitle}>Payment History</Text>
            </View>
            {documentPayments.length === 0 ? (
              <Text style={styles.noPaymentsText}>No payments recorded yet</Text>
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
});
