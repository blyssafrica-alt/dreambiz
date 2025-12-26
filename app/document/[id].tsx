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

  const docTypeLabel = document.type.charAt(0).toUpperCase() + document.type.slice(1);

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
        <View style={[
          styles.header,
          template && { 
            backgroundColor: `${template.styling.primaryColor}15`,
            borderLeftWidth: 4,
            borderLeftColor: template.styling.primaryColor,
          }
        ]}>
          <View style={[
            styles.badge,
            template && { backgroundColor: template.styling.primaryColor + '20' }
          ]}>
            <Text style={[
              styles.badgeText,
              template && { color: template.styling.primaryColor }
            ]}>
              {template?.name || docTypeLabel}
            </Text>
          </View>
          <Text style={styles.docNumber}>{document.documentNumber}</Text>
          <Text style={styles.date}>{formatDate(document.date)}</Text>
          {template && (
            <Text style={styles.templateInfo}>
              {business?.type.charAt(0).toUpperCase() + business?.type.slice(1)} Business Template
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From</Text>
          <View style={styles.infoCard}>
            <Text style={styles.businessName}>{business?.name}</Text>
            {business?.phone && <Text style={styles.infoText}>{business.phone}</Text>}
            {business?.location && <Text style={styles.infoText}>{business.location}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To</Text>
          <View style={styles.infoCard}>
            <Text style={styles.customerName}>{document.customerName}</Text>
            {document.customerPhone && (
              <Text style={styles.infoText}>{document.customerPhone}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {document.items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>{index + 1}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(document.subtotal)}</Text>
          </View>
          {document.tax && (
            <>
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>{formatCurrency(document.tax)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelFinal}>Total</Text>
            <Text style={styles.totalValueFinal}>{formatCurrency(document.total)}</Text>
          </View>
          {document.type === 'invoice' && (
            <>
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid</Text>
                <Text style={[styles.totalValue, { color: '#10B981' }]}>{formatCurrency(paidAmount)}</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabelFinal, { color: outstandingAmount > 0 ? '#EF4444' : '#10B981' }]}>
                  Outstanding
                </Text>
                <Text style={[styles.totalValueFinal, { color: outstandingAmount > 0 ? '#EF4444' : '#10B981' }]}>
                  {formatCurrency(outstandingAmount)}
                </Text>
              </View>
            </>
          )}
        </View>

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

        {/* Template-specific fields */}
        {template && (() => {
          try {
            const templateData = document.notes ? JSON.parse(document.notes) : null;
            if (templateData && templateData.fields && Object.keys(templateData.fields).length > 0) {
              return (
                <View style={styles.templateFieldsCard}>
                  <Text style={styles.templateFieldsTitle}>Additional Information</Text>
                  {Object.entries(templateData.fields).map(([key, value]) => {
                    const field = template.fields.find(f => f.id === key);
                    if (!field || !value) return null;
                    return (
                      <View key={key} style={styles.templateFieldRow}>
                        <Text style={styles.templateFieldLabel}>{field.label}:</Text>
                        <Text style={styles.templateFieldValue}>{String(value)}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            }
          } catch {
            // If notes is not JSON, treat as regular notes
          }
          return null;
        })()}

        {document.notes && (() => {
          try {
            JSON.parse(document.notes);
            return null; // Already displayed as template fields
          } catch {
            return (
              <View style={styles.notesCard}>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notesText}>{document.notes}</Text>
              </View>
            );
          }
        })()}

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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#0066CC',
    textTransform: 'uppercase',
  },
  docNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    color: '#64748B',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    color: '#0066CC',
    fontSize: 12,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 24,
  },
  itemInfo: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: '#64748B',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0066CC',
  },
  totalsCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: '#94A3B8',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  totalValueFinal: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  notesCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
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
  templateInfo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 40,
  },
  templateFieldsCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  templateFieldsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0369A1',
    marginBottom: 12,
  },
  templateFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  templateFieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#0369A1',
    flex: 1,
  },
  templateFieldValue: {
    fontSize: 13,
    color: '#0C4A6E',
    flex: 1,
    textAlign: 'right',
  },
  paymentsSection: {
    marginTop: 24,
    marginBottom: 16,
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
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPaymentText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
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
});
