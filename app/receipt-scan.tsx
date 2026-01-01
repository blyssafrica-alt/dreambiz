import { Stack, router } from 'expo-router';
import { Camera, X, Check, AlertCircle, Loader, Save } from 'lucide-react-native';
import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert as RNAlert,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import PageHeader from '@/components/PageHeader';
import { processReceiptImage } from '@/lib/receipt-ocr';

export default function ReceiptScanScreen() {
  const { business, addTransaction } = useBusiness();
  const { theme } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [extractedItems, setExtractedItems] = useState<string[]>([]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please grant camera roll access to scan receipts');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
        processReceipt(result.assets[0].uri);
      }
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        RNAlert.alert('Permission Required', 'Please grant camera access to scan receipts');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
        processReceipt(result.assets[0].uri);
      }
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to take photo');
    }
  };

  const processReceipt = async (imageUri: string) => {
    setProcessing(true);
    try {
      // Extract and parse receipt data using static import
      // Error handling is done within the OCR function itself
      const receiptData = await processReceiptImage(imageUri, business?.currency || 'USD');
      
      // Pre-fill form with extracted data
      if (receiptData && typeof receiptData === 'object') {
        if (receiptData.amount && typeof receiptData.amount === 'number' && receiptData.amount > 0) {
          setAmount(receiptData.amount.toString());
        }
        if (receiptData.merchant && typeof receiptData.merchant === 'string') {
          setMerchant(receiptData.merchant);
        }
        if (receiptData.address && typeof receiptData.address === 'string') {
          setAddress(receiptData.address);
        }
        if (receiptData.category && typeof receiptData.category === 'string') {
          setCategory(receiptData.category);
        }
        if (receiptData.date && typeof receiptData.date === 'string') {
          setDate(receiptData.date);
        }
        
        // Store extracted items separately
        if (receiptData.items && Array.isArray(receiptData.items) && receiptData.items.length > 0) {
          setExtractedItems(receiptData.items);
          // Create description from items
          const itemsDescription = receiptData.items.join('\n');
          setDescription(itemsDescription);
        } else {
          setExtractedItems([]);
          if (receiptData.merchant) {
            setDescription(`Receipt from ${receiptData.merchant}`);
          }
        }
      }
      
      setProcessing(false);
      setShowManualForm(true);
      
      // Show success message with extracted info
      if (receiptData && (receiptData.amount || receiptData.merchant)) {
        const itemsCount = receiptData.items?.length || 0;
        const itemsInfo = itemsCount > 0 ? `\nItems: ${itemsCount} found` : '';
        const merchantInfo = receiptData.merchant ? `Merchant: ${receiptData.merchant}\n` : '';
        const amountInfo = receiptData.amount ? `Total: ${business?.currency || 'USD'} ${receiptData.amount.toFixed(2)}\n` : '';
        const dateInfo = receiptData.date ? `Date: ${receiptData.date}\n` : '';
        
        RNAlert.alert(
          'Receipt Scanned Successfully',
          `Extracted Information:\n${merchantInfo}${amountInfo}${dateInfo}${itemsInfo}\n\nPlease review and confirm the details.`,
          [{ text: 'OK' }]
        );
      } else {
        // No data extracted, but still show form
        RNAlert.alert(
          'Receipt Processed',
          'Please review and enter the receipt details manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Receipt processing error:', error);
      setProcessing(false);
      
      // Show manual entry form even if OCR fails
      const errorMessage = error?.message || 'Unable to extract receipt information automatically.';
      
      // Check if it's an OCR availability error
      const isOCRError = errorMessage.includes('OCR services are not available') || 
                        errorMessage.includes('not available') ||
                        errorMessage.includes('quota exceeded');
      
      if (isOCRError) {
        RNAlert.alert(
          'OCR Not Available',
          `${errorMessage}\n\nPlease enter the receipt details manually.`,
          [{ text: 'OK', onPress: () => setShowManualForm(true) }]
        );
      } else {
        RNAlert.alert(
          'Manual Entry Required',
          `${errorMessage}\n\nPlease enter the receipt details manually.`,
          [{ text: 'OK', onPress: () => setShowManualForm(true) }]
        );
      }
    }
  };

  const handleSave = async () => {
    if (!amount || !merchant) {
      RNAlert.alert('Missing Fields', 'Please enter amount and merchant name');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      RNAlert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      // Build description with all receipt details, prioritizing items
      let fullDescription = '';
      
      // Start with items if available (most important for user to see what they bought)
      if (extractedItems.length > 0) {
        fullDescription = 'Items:\n' + extractedItems.map((item, index) => `${index + 1}. ${item}`).join('\n');
      } else if (description) {
        fullDescription = description;
      }
      
      // Add merchant and address info
      if (merchant) {
        fullDescription += fullDescription ? `\n\nStore: ${merchant}` : `Store: ${merchant}`;
      }
      if (address) {
        fullDescription += fullDescription ? `\nAddress: ${address}` : `Address: ${address}`;
      }
      
      // Fallback if nothing was extracted
      if (!fullDescription) {
        fullDescription = `Receipt: ${merchant || 'Unknown Store'}`;
      }

      await addTransaction({
        type: 'expense',
        amount: amountValue,
        description: fullDescription,
        category: category || 'Other Expenses',
        currency: business?.currency || 'USD',
        date: date,
      });
      
      RNAlert.alert('Success', 'Receipt expense saved successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      RNAlert.alert('Error', error.message || 'Failed to save expense');
    }
  };

  const handleReset = () => {
    setImage(null);
    setProcessing(false);
    setShowManualForm(false);
    setAmount('');
    setMerchant('');
    setAddress('');
    setCategory('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setExtractedItems([]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
        <PageHeader
          title="Scan Receipt"
          subtitle="Extract expense information from receipts"
          icon={Camera}
          iconGradient={['#3B82F6', '#2563EB']}
        />
        
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {!image ? (
            <View style={styles.uploadSection}>
              <View style={[styles.iconContainer, { backgroundColor: theme.background.card }]}>
                <Camera size={64} color={theme.accent.primary} />
              </View>
              <Text style={[styles.title, { color: theme.text.primary }]}>
                Scan Receipt
              </Text>
              <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                Take a photo or select from gallery to extract expense information
              </Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { backgroundColor: theme.accent.primary }]}
                  onPress={takePhoto}
                >
                  <Camera size={20} color="#FFF" />
                  <Text style={styles.buttonText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton, { 
                    backgroundColor: theme.background.card, 
                    borderColor: theme.accent.primary 
                  }]}
                  onPress={pickImage}
                >
                  <Text style={[styles.buttonTextSecondary, { color: theme.accent.primary }]}>
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.previewSection}>
              {processing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color={theme.accent.primary} />
                  <Text style={[styles.processingText, { color: theme.text.secondary }]}>
                    Processing receipt...
                  </Text>
                  <Text style={[styles.processingSubtext, { color: theme.text.tertiary }]}>
                    Extracting information from image
                  </Text>
                </View>
              ) : (
                <>
                  <Image source={{ uri: image }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={[styles.retakeButton, { backgroundColor: theme.background.card }]}
                    onPress={handleReset}
                  >
                    <X size={18} color={theme.text.secondary} />
                    <Text style={[styles.retakeButtonText, { color: theme.text.secondary }]}>
                      Retake Photo
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Manual Entry Modal */}
        <Modal
          visible={showManualForm}
          animationType="slide"
          transparent
          onRequestClose={() => setShowManualForm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
                  Enter Receipt Details
                </Text>
                <TouchableOpacity onPress={() => setShowManualForm(false)}>
                  <X size={24} color={theme.text.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBodyWrapper}>
                <ScrollView 
                  style={styles.modalBody} 
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>
                    Amount ({business?.currency || 'USD'}) *
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
                  <Text style={[styles.label, { color: theme.text.primary }]}>
                    Merchant/Store Name *
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    }]}
                    placeholder="e.g., Shoprite, Shell, etc."
                    placeholderTextColor={theme.text.tertiary}
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>
                    Store Address
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    }]}
                    placeholder="e.g., 123 Main Street, Harare"
                    placeholderTextColor={theme.text.tertiary}
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {EXPENSE_CATEGORIES.map((cat) => (
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

                {/* Show extracted items if available */}
                {extractedItems.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text.primary }]}>
                      Items from Receipt ({extractedItems.length})
                    </Text>
                    <View style={[styles.itemsContainer, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}>
                      <ScrollView 
                        style={styles.itemsScrollView}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {extractedItems.map((item, index) => (
                          <View key={index} style={[styles.itemRow, { borderBottomColor: theme.border.light }]}>
                            <Text style={[styles.itemText, { color: theme.text.primary }]}>
                              {item}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                    <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                      These items were extracted from your receipt. You can edit the description below.
                    </Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    }]}
                    placeholder={extractedItems.length > 0 ? "Items are shown above. Add additional notes here if needed." : "Additional notes (optional)"}
                    placeholderTextColor={theme.text.tertiary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text.primary }]}>Date</Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme.background.secondary,
                      color: theme.text.primary,
                      borderColor: theme.border.light,
                    }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.text.tertiary}
                    value={date}
                    onChangeText={setDate}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { 
                      backgroundColor: theme.background.secondary,
                      borderColor: theme.border.light,
                    }]}
                    onPress={() => setShowManualForm(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.text.secondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.accent.primary }]}
                    onPress={handleSave}
                  >
                    <Save size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Expense</Text>
                  </TouchableOpacity>
                </View>
                </ScrollView>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  uploadSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 2,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  previewSection: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  processingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  processingSubtext: {
    marginTop: 8,
    fontSize: 14,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
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
    minHeight: '70%',
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
  modalBodyWrapper: {
    flex: 1,
    minHeight: 300,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    paddingBottom: 20,
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
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
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
  itemsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 200,
    marginBottom: 8,
  },
  itemsScrollView: {
    maxHeight: 200,
  },
  itemRow: {
    padding: 12,
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
