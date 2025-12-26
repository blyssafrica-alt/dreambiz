import { Stack, router } from 'expo-router';
import { Camera, X, Check, AlertCircle, Loader } from 'lucide-react-native';
import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert as RNAlert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useBusiness } from '@/contexts/BusinessContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function ReceiptScanScreen() {
  const { business, addTransaction } = useBusiness();
  const { theme } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    amount?: number;
    merchant?: string;
    date?: string;
    items?: string[];
  } | null>(null);

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
      // Simulate OCR processing
      // In production, you would use a real OCR service like:
      // - Google Cloud Vision API
      // - AWS Textract
      // - Tesseract.js
      // - Azure Computer Vision
      
      // For now, we'll extract basic info from user input
      // This is a placeholder - in production, integrate with OCR service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock extracted data - in production, this would come from OCR
      const mockData = {
        amount: 0,
        merchant: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
      };
      
      setExtractedData(mockData);
      setProcessing(false);
      
      // Show manual entry modal
      showManualEntryModal();
    } catch {
      setProcessing(false);
      RNAlert.alert('Error', 'Failed to process receipt. Please enter details manually.');
      showManualEntryModal();
    }
  };

  const showManualEntryModal = () => {
    RNAlert.prompt(
      'Enter Receipt Amount',
      'Please enter the total amount from the receipt',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setImage(null) },
        {
          text: 'Next',
          onPress: (amount) => {
            if (amount && !isNaN(parseFloat(amount))) {
              setExtractedData({
                ...extractedData,
                amount: parseFloat(amount),
              });
              showMerchantPrompt();
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const showMerchantPrompt = () => {
    RNAlert.prompt(
      'Enter Merchant Name',
      'Please enter the merchant/store name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (merchant) => {
            if (extractedData?.amount) {
              await saveExpense(extractedData.amount, merchant || 'Receipt');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const saveExpense = async (amount: number, merchant: string) => {
    try {
      await addTransaction({
        type: 'expense',
        amount,
        description: `Receipt: ${merchant}`,
        category: 'Other',
        currency: business?.currency || 'USD',
        date: new Date().toISOString().split('T')[0],
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background.secondary }]}>
      <Stack.Screen 
        options={{ 
          title: 'Scan Receipt',
          headerShown: true,
        }} 
      />
      
      <View style={styles.content}>
        {!image ? (
          <View style={styles.uploadSection}>
            <View style={[styles.iconContainer, { backgroundColor: theme.background.card }]}>
              <Camera size={48} color={theme.accent.primary} />
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
                style={[styles.button, styles.secondaryButton, { backgroundColor: theme.background.card, borderColor: theme.accent.primary }]}
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
              </View>
            ) : (
              <>
                <Image source={{ uri: image }} style={styles.previewImage} />
                {extractedData && (
                  <View style={[styles.extractedData, { backgroundColor: theme.background.card }]}>
                    <Text style={[styles.extractedTitle, { color: theme.text.primary }]}>
                      Extracted Information
                    </Text>
                    {extractedData.amount && (
                      <View style={styles.extractedRow}>
                        <Text style={[styles.extractedLabel, { color: theme.text.secondary }]}>
                          Amount:
                        </Text>
                        <Text style={[styles.extractedValue, { color: theme.text.primary }]}>
                          {business?.currency === 'USD' ? '$' : 'ZWL'}{extractedData.amount.toFixed(2)}
                        </Text>
                      </View>
                    )}
                    {extractedData.merchant && (
                      <View style={styles.extractedRow}>
                        <Text style={[styles.extractedLabel, { color: theme.text.secondary }]}>
                          Merchant:
                        </Text>
                        <Text style={[styles.extractedValue, { color: theme.text.primary }]}>
                          {extractedData.merchant}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => {
                  setImage(null);
                  setExtractedData(null);
                }}
              >
                <X size={20} color={theme.text.secondary} />
                <Text style={[styles.actionButtonText, { color: theme.text.secondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  uploadSection: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 2,
    // backgroundColor and borderColor set dynamically
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewSection: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginBottom: 16,
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
  },
  extractedData: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  extractedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  extractedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  extractedLabel: {
    fontSize: 14,
  },
  extractedValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

