import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { ArrowLeft, Save, DollarSign, Camera, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export default function AddPaymentScreen() {
  const { theme } = useTheme();
  const { documents = [], addPayment } = useBusiness();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'mobile_money' | 'card' | 'other'>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const safeDocuments = Array.isArray(documents) ? documents : [];
  const invoices = safeDocuments.filter(d => d?.type === 'invoice' && d?.status !== 'paid' && d?.status !== 'cancelled');

  const selectedDocument = invoices.find(d => d.id === selectedDocumentId);
  const outstandingAmount = selectedDocument ? (selectedDocument.total || 0) - (selectedDocument.paidAmount || 0) : 0;

  const handlePickProofImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll access to upload proof of payment');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setIsUploadingProof(true);
          try {
            const fileExt = asset.uri.split('.').pop() || 'jpg';
            const fileName = `payment-proof-${Date.now()}.${fileExt}`;
            const filePath = `payment_proofs/${fileName}`;

            const { data, error } = await supabase.storage
              .from('payment_proofs')
              .upload(filePath, decode(asset.base64), {
                contentType: asset.mimeType || 'image/jpeg',
                upsert: false,
              });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
              .from('payment_proofs')
              .getPublicUrl(filePath);

            if (publicUrlData?.publicUrl) {
              setProofImage(publicUrlData.publicUrl);
            }
          } catch (error: any) {
            console.error('Error uploading proof:', error);
            Alert.alert('Upload Error', error.message || 'Failed to upload proof of payment');
          } finally {
            setIsUploadingProof(false);
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const handleRemoveProofImage = () => {
    setProofImage(null);
  };

  const handleSave = async () => {
    console.log('handleSave called', { selectedDocumentId, amount, outstandingAmount, selectedDocument });
    
    if (!selectedDocumentId) {
      Alert.alert('Missing Field', 'Please select a document');
      return;
    }

    if (!amount || amount.trim() === '') {
      Alert.alert('Missing Field', 'Please enter payment amount');
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    if (outstandingAmount > 0 && paymentAmount > outstandingAmount) {
      Alert.alert('Invalid Amount', `Amount cannot exceed outstanding balance of ${selectedDocument?.currency || 'USD'} ${outstandingAmount.toFixed(2)}`);
      return;
    }

    try {
      console.log('Attempting to save payment...');
      setIsLoading(true);
      
      const paymentData = {
        documentId: selectedDocumentId,
        amount: paymentAmount,
        currency: selectedDocument?.currency || 'USD',
        paymentDate,
        paymentMethod,
        reference: reference || undefined,
        notes: notes || undefined,
        proofOfPaymentUrl: proofImage || undefined,
        verificationStatus: 'pending' as const,
      };
      
      console.log('Payment data:', paymentData);
      await addPayment(paymentData);

      Alert.alert('Success', 'Payment recorded successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving payment:', error);
      Alert.alert('Error', error?.message || 'Failed to record payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'Record Payment', headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Record Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Document Selection */}
        <View style={[styles.section, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Select Document</Text>
          {invoices.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              No unpaid invoices available
            </Text>
          ) : (
            invoices.map(doc => (
              <TouchableOpacity
                key={doc.id}
                style={[
                  styles.documentCard,
                  { backgroundColor: theme.background.secondary },
                  selectedDocumentId === doc.id && { borderColor: theme.accent.primary, borderWidth: 2 }
                ]}
                onPress={() => setSelectedDocumentId(doc.id)}
              >
                <View style={styles.documentInfo}>
                  <Text style={[styles.documentNumber, { color: theme.text.primary }]}>
                    {doc.number || doc.id}
                  </Text>
                  <Text style={[styles.documentCustomer, { color: theme.text.secondary }]}>
                    {doc.customerName || 'Unknown Customer'}
                  </Text>
                  <Text style={[styles.documentAmount, { color: theme.accent.primary }]}>
                    {doc.currency} {outstandingAmount.toFixed(2)} outstanding
                  </Text>
                </View>
                {selectedDocumentId === doc.id && (
                  <View style={[styles.checkmark, { backgroundColor: theme.accent.primary }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Payment Details */}
        {selectedDocument && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Payment Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Amount *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.text.tertiary}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.helperText, { color: theme.text.tertiary }]}>
                Outstanding: {selectedDocument.currency} {outstandingAmount.toFixed(2)}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Payment Date *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={paymentDate}
                onChangeText={setPaymentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Payment Method *</Text>
              <View style={styles.methodOptions}>
                {(['cash', 'bank_transfer', 'mobile_money', 'card', 'other'] as const).map(method => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.methodOption,
                      {
                        backgroundColor: paymentMethod === method ? theme.accent.primary : theme.background.secondary,
                        borderColor: paymentMethod === method ? theme.accent.primary : theme.border.light,
                      }
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[
                      styles.methodOptionText,
                      { color: paymentMethod === method ? '#FFF' : theme.text.primary }
                    ]}>
                      {method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Reference</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={reference}
                onChangeText={setReference}
                placeholder="Payment reference number"
                placeholderTextColor={theme.text.tertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.background.secondary, color: theme.text.primary }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes"
                placeholderTextColor={theme.text.tertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Proof of Payment</Text>
              <Text style={[styles.helperText, { color: theme.text.tertiary, marginBottom: 8 }]}>
                Attach a receipt, screenshot, or photo of your payment
              </Text>
              {proofImage ? (
                <View style={styles.proofImageContainer}>
                  <Image source={{ uri: proofImage }} style={styles.proofImage} />
                  <TouchableOpacity
                    style={[styles.removeProofButton, { backgroundColor: theme.accent.danger }]}
                    onPress={handleRemoveProofImage}
                  >
                    <X size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.proofUploadButton, { backgroundColor: theme.background.secondary, borderColor: theme.border.light }]}
                  onPress={handlePickProofImage}
                  disabled={isUploadingProof}
                >
                  {isUploadingProof ? (
                    <ActivityIndicator color={theme.accent.primary} />
                  ) : (
                    <>
                      <Camera size={24} color={theme.accent.primary} />
                      <Text style={[styles.proofUploadText, { color: theme.text.primary }]}>
                        Upload Proof of Payment
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton, 
            { 
              backgroundColor: (isLoading || !selectedDocumentId) ? theme.border.medium : theme.accent.primary,
              opacity: (isLoading || !selectedDocumentId) ? 0.5 : 1,
            }
          ]}
          onPress={() => {
            console.log('Record Payment button pressed', { selectedDocumentId, amount, isLoading });
            if (!selectedDocumentId) {
              Alert.alert('No Document Selected', 'Please select a document first');
              return;
            }
            handleSave();
          }}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Save size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Record Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  documentCard: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  documentCustomer: {
    fontSize: 14,
    marginBottom: 4,
  },
  documentAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  methodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  methodOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  proofImageContainer: {
    position: 'relative',
    marginTop: 8,
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeProofButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  proofUploadText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

