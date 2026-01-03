/**
 * Start Shift Modal
 * Prompts employee to enter opening cash when starting a new shift
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, DollarSign } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface StartShiftModalProps {
  visible: boolean;
  onStartShift: (openingCash: number) => Promise<void>;
  onCancel: () => void;
  suggestedOpeningCash?: number;
  currency?: string;
}

export default function StartShiftModal({
  visible,
  onStartShift,
  onCancel,
  suggestedOpeningCash = 0,
  currency = 'USD',
}: StartShiftModalProps) {
  const { theme } = useTheme();
  const [openingCash, setOpeningCash] = useState(suggestedOpeningCash.toString());
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    const cash = parseFloat(openingCash);
    if (isNaN(cash) || cash < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid opening cash amount');
      return;
    }

    setIsStarting(true);
    try {
      await onStartShift(cash);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start shift');
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancel = () => {
    setOpeningCash(suggestedOpeningCash.toString());
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background.card }]}>
          {/* Header */}
          <LinearGradient
            colors={[`${theme.accent.primary}15`, 'transparent']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[theme.accent.primary, theme.accent.secondary]}
                  style={styles.iconGradient}
                >
                  <DollarSign size={24} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              </View>
              <Text style={[styles.title, { color: theme.text.primary }]}>Start New Shift</Text>
              <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
                Enter the opening cash amount in the drawer
              </Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
                disabled={isStarting}
              >
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: theme.text.primary }]}>Opening Cash</Text>
              <Text style={[styles.hint, { color: theme.text.tertiary }]}>
                Count all cash in the drawer and enter the total
              </Text>
              <View style={[styles.inputContainer, { borderColor: theme.border.light }]}>
                <Text style={[styles.currencySymbol, { color: theme.text.secondary }]}>
                  {currency === 'USD' ? '$' : 'ZWL'}
                </Text>
                <TextInput
                  style={[styles.input, { color: theme.text.primary }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.text.tertiary}
                  value={openingCash}
                  onChangeText={setOpeningCash}
                  keyboardType="decimal-pad"
                  editable={!isStarting}
                  autoFocus
                />
              </View>
              {suggestedOpeningCash > 0 && (
                <TouchableOpacity
                  onPress={() => setOpeningCash(suggestedOpeningCash.toString())}
                  style={[styles.suggestedButton, { backgroundColor: theme.background.secondary }]}
                  disabled={isStarting}
                >
                  <Text style={[styles.suggestedText, { color: theme.accent.primary }]}>
                    Use suggested: {currency} {suggestedOpeningCash.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: theme.border.medium, backgroundColor: theme.background.secondary },
                ]}
                onPress={handleCancel}
                disabled={isStarting}
              >
                <Text style={[styles.buttonText, { color: theme.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.startButton, { backgroundColor: theme.accent.primary }]}
                onPress={handleStart}
                disabled={isStarting}
              >
                {isStarting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.startButtonText}>Start Shift</Text>
                )}
              </TouchableOpacity>
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    paddingBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  suggestedButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  suggestedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButton: {
    borderWidth: 1,
  },
  startButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

