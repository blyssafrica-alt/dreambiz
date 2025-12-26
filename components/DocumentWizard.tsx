import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert as RNAlert,
} from 'react-native';
import { 
  FileText, 
  Receipt, 
  FileCheck, 
  ShoppingCart, 
  FileSignature, 
  Handshake,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import type { DocumentType, DocumentItem } from '@/types/business';
import { getDocumentTemplate } from '@/lib/document-templates';

interface DocumentWizardProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (document: {
    type: DocumentType;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    items: DocumentItem[];
    dueDate?: string;
    notes?: string;
    templateFields: Record<string, string>;
  }) => void;
  businessType?: string;
}

const DOCUMENT_TYPES: { type: DocumentType; label: string; icon: any; description: string }[] = [
  { type: 'invoice', label: 'Invoice', icon: FileText, description: 'Bill your customers for products or services' },
  { type: 'receipt', label: 'Receipt', icon: Receipt, description: 'Confirm payment received from customers' },
  { type: 'quotation', label: 'Quotation', icon: FileCheck, description: 'Provide price estimates to potential customers' },
  { type: 'purchase_order', label: 'Purchase Order', icon: ShoppingCart, description: 'Order products from suppliers' },
  { type: 'contract', label: 'Contract', icon: FileSignature, description: 'Create formal agreements with clients' },
  { type: 'supplier_agreement', label: 'Supplier Agreement', icon: Handshake, description: 'Establish terms with suppliers' },
];

export default function DocumentWizard({ visible, onClose, onComplete, businessType }: DocumentWizardProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [items, setItems] = useState<{ description: string; quantity: string; price: string }[]>([
    { description: '', quantity: '1', price: '' }
  ]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({});

  const template = docType && businessType ? getDocumentTemplate(docType, businessType as any) : null;

  const resetWizard = () => {
    setStep(1);
    setDocType(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setItems([{ description: '', quantity: '1', price: '' }]);
    setDueDate('');
    setNotes('');
    setTemplateFields({});
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && !docType) {
      RNAlert.alert('Select Document Type', 'Please select a document type to continue');
      return;
    }
    if (step === 2 && !customerName.trim()) {
      RNAlert.alert('Customer Required', 'Please enter customer name');
      return;
    }
    if (step === 3) {
      const hasItems = items.some(item => item.description.trim() && item.price);
      if (!hasItems) {
        RNAlert.alert('Items Required', 'Please add at least one item');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: '1', price: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: 'description' | 'quantity' | 'price', value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleComplete = () => {
    if (!docType || !customerName.trim()) {
      RNAlert.alert('Required Fields', 'Please fill in all required fields');
      return;
    }

    const hasItems = items.some(item => item.description.trim() && item.price);
    if (!hasItems) {
      RNAlert.alert('Items Required', 'Please add at least one item');
      return;
    }

    const documentItems: DocumentItem[] = items
      .filter(item => item.description.trim() && item.price)
      .map((item, index) => {
        const quantity = parseFloat(item.quantity) || 1;
        const unitPrice = parseFloat(item.price) || 0;
        return {
          id: `item-${index}`,
          description: item.description,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        };
      });

    onComplete({
      type: docType,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      items: documentItems,
      dueDate: dueDate.trim() || undefined,
      notes: notes.trim() || undefined,
      templateFields,
    });

    resetWizard();
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
        What type of document do you want to create?
      </Text>
      <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
        Select the document type that best fits your needs
      </Text>
      
      <View style={styles.documentTypesGrid}>
        {DOCUMENT_TYPES.map((doc) => {
          const Icon = doc.icon;
          const isSelected = docType === doc.type;
          return (
            <TouchableOpacity
              key={doc.type}
              style={[
                styles.documentTypeCard,
                {
                  backgroundColor: isSelected ? theme.background.secondary : theme.background.card,
                  borderColor: isSelected ? theme.accent.primary : theme.border.light,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setDocType(doc.type)}
            >
              <View style={[
                styles.documentTypeIcon,
                { backgroundColor: isSelected ? theme.accent.primary + '20' : theme.background.secondary }
              ]}>
                <Icon size={32} color={isSelected ? theme.accent.primary : theme.text.secondary} />
              </View>
              <Text style={[styles.documentTypeLabel, { color: theme.text.primary }]}>
                {doc.label}
              </Text>
              <Text style={[styles.documentTypeDesc, { color: theme.text.secondary }]}>
                {doc.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
        Customer Information
      </Text>
      <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
        {docType === 'purchase_order' || docType === 'supplier_agreement'
          ? 'Enter supplier details'
          : 'Enter customer details'}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.secondary }]}>
          {docType === 'purchase_order' || docType === 'supplier_agreement' ? 'Supplier Name' : 'Customer Name'} *
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.background.secondary,
            borderColor: theme.border.light,
            color: theme.text.primary,
          }]}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Enter name"
          placeholderTextColor={theme.text.tertiary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.secondary }]}>
          Phone Number
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.background.secondary,
            borderColor: theme.border.light,
            color: theme.text.primary,
          }]}
          value={customerPhone}
          onChangeText={setCustomerPhone}
          placeholder="+263..."
          placeholderTextColor={theme.text.tertiary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text.secondary }]}>
          Email Address
        </Text>
        <TextInput
          style={[styles.input, {
            backgroundColor: theme.background.secondary,
            borderColor: theme.border.light,
            color: theme.text.primary,
          }]}
          value={customerEmail}
          onChangeText={setCustomerEmail}
          placeholder="email@example.com"
          placeholderTextColor={theme.text.tertiary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
          Items & Services
        </Text>
        <TouchableOpacity
          style={[styles.addItemButton, { backgroundColor: theme.accent.primary }]}
          onPress={handleAddItem}
        >
          <Plus size={18} color="#FFF" />
          <Text style={styles.addItemText}>Add Item</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
        Add products or services for this document
      </Text>

      <ScrollView style={styles.itemsList}>
        {items.map((item, index) => (
          <View key={index} style={[styles.itemCard, { backgroundColor: theme.background.card }]}>
            <View style={styles.itemHeader}>
              <Text style={[styles.itemNumber, { color: theme.text.secondary }]}>
                Item {index + 1}
              </Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                  <Trash2 size={18} color={theme.accent.danger} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>Description *</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.background.secondary,
                  borderColor: theme.border.light,
                  color: theme.text.primary,
                }]}
                value={item.description}
                onChangeText={(value) => handleItemChange(index, 'description', value)}
                placeholder="Product or service name"
                placeholderTextColor={theme.text.tertiary}
              />
            </View>

            <View style={styles.itemRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.secondary,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  value={item.quantity}
                  onChangeText={(value) => handleItemChange(index, 'quantity', value)}
                  placeholder="1"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>Unit Price *</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.secondary,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  value={item.price}
                  onChangeText={(value) => handleItemChange(index, 'price', value)}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep4 = () => {
    const templateFieldsList = template?.fields || [];
    
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.text.primary }]}>
          Additional Details
        </Text>
        <Text style={[styles.stepDescription, { color: theme.text.secondary }]}>
          Add any additional information for this document
        </Text>

        {(docType === 'invoice' || docType === 'quotation') && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>
              Due Date
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: theme.background.secondary,
                borderColor: theme.border.light,
                color: theme.text.primary,
              }]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.text.tertiary}
            />
          </View>
        )}

        {templateFieldsList.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.accent.primary, marginTop: 16 }]}>
              {docType?.toUpperCase().replace('_', ' ')} SPECIFIC FIELDS
            </Text>
            {templateFieldsList.map((field) => (
              <View key={field.key} style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text.secondary }]}>
                  {field.label}{field.required ? ' *' : ''}
                </Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.background.secondary,
                    borderColor: theme.border.light,
                    color: theme.text.primary,
                  }]}
                  value={templateFields[field.key] || ''}
                  onChangeText={(value) => setTemplateFields({ ...templateFields, [field.key]: value })}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.text.tertiary}
                  multiline={field.type === 'textarea'}
                />
              </View>
            ))}
          </>
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text.secondary }]}>
            Notes (Optional)
          </Text>
          <TextInput
            style={[styles.input, styles.textArea, {
              backgroundColor: theme.background.secondary,
              borderColor: theme.border.light,
              color: theme.text.primary,
            }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes or terms..."
            placeholderTextColor={theme.text.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>
    );
  };

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.background.card }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                Create {docType ? DOCUMENT_TYPES.find(d => d.type === docType)?.label : 'Document'}
              </Text>
              <Text style={[styles.stepIndicator, { color: theme.text.secondary }]}>
                Step {step} of {totalSteps}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.progressBar, { backgroundColor: theme.background.secondary }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.accent.primary }]} />
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </ScrollView>

          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.footerButton, styles.backButton, { borderColor: theme.border.medium }]}
                onPress={handleBack}
              >
                <ArrowLeft size={20} color={theme.text.primary} />
                <Text style={[styles.footerButtonText, { color: theme.text.primary }]}>Back</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            {step < totalSteps ? (
              <TouchableOpacity
                style={[styles.footerButton, styles.nextButton]}
                onPress={handleNext}
              >
                <Text style={[styles.footerButtonText, { color: '#FFF' }]}>Next</Text>
                <ArrowRight size={20} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.footerButton, styles.completeButton]}
                onPress={handleComplete}
              >
                <LinearGradient
                  colors={theme.gradient.primary as [string, string]}
                  style={styles.completeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.completeButtonText}>Create Document</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  stepIndicator: {
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 22,
  },
  documentTypesGrid: {
    gap: 16,
  },
  documentTypeCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  documentTypeIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  documentTypeLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  documentTypeDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addItemText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  itemsList: {
    marginTop: 16,
  },
  itemCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  itemRow: {
    flexDirection: 'row',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 2,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
  },
  backButton: {
    borderWidth: 2,
  },
  nextButton: {
    backgroundColor: '#0066CC',
  },
  completeButton: {
    flex: 1,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
});

