/**
 * Shift Handover Modal
 * Allows employee to continue existing shift or start new one
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Clock, User, ArrowRight, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import type { ShiftInfo } from '@/lib/shift-management';

interface ShiftHandoverModalProps {
  visible: boolean;
  shift: ShiftInfo;
  openedByEmployeeName: string;
  onContinueShift: () => Promise<void>;
  onStartNewShift: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ShiftHandoverModal({
  visible,
  shift,
  openedByEmployeeName,
  onContinueShift,
  onStartNewShift,
  onCancel,
  isLoading = false,
}: ShiftHandoverModalProps) {
  const { theme } = useTheme();
  const startTime = new Date(shift.shiftStartTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
                  <Clock size={24} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              </View>
              <Text style={[styles.title, { color: theme.text.primary }]}>Shift in Progress</Text>
              <TouchableOpacity
                onPress={onCancel}
                style={styles.closeButton}
                disabled={isLoading}
              >
                <X size={24} color={theme.text.tertiary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <View style={[styles.shiftInfo, { backgroundColor: theme.background.secondary }]}>
              <View style={styles.shiftInfoRow}>
                <User size={18} color={theme.text.secondary} />
                <Text style={[styles.shiftInfoLabel, { color: theme.text.secondary }]}>Opened by:</Text>
                <Text style={[styles.shiftInfoValue, { color: theme.text.primary }]}>
                  {openedByEmployeeName}
                </Text>
              </View>
              <View style={styles.shiftInfoRow}>
                <Clock size={18} color={theme.text.secondary} />
                <Text style={[styles.shiftInfoLabel, { color: theme.text.secondary }]}>Started:</Text>
                <Text style={[styles.shiftInfoValue, { color: theme.text.primary }]}>{startTime}</Text>
              </View>
            </View>

            <Text style={[styles.message, { color: theme.text.secondary }]}>
              A shift is already open. Would you like to continue this shift or start a new one?
            </Text>

            {/* Options */}
            <View style={styles.options}>
              <TouchableOpacity
                style={[styles.option, { borderColor: theme.border.light, backgroundColor: theme.background.secondary }]}
                onPress={onContinueShift}
                disabled={isLoading}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionLeft}>
                    <LinearGradient
                      colors={[theme.accent.primary, theme.accent.secondary]}
                      style={styles.optionIcon}
                    >
                      <ArrowRight size={20} color="#FFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <View>
                      <Text style={[styles.optionTitle, { color: theme.text.primary }]}>
                        Continue Shift
                      </Text>
                      <Text style={[styles.optionDescription, { color: theme.text.tertiary }]}>
                        Take over and continue the existing shift
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.option, { borderColor: theme.border.light, backgroundColor: theme.background.secondary }]}
                onPress={onStartNewShift}
                disabled={isLoading}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionIcon, { backgroundColor: theme.accent.primary + '20' }]}>
                      <Clock size={20} color={theme.accent.primary} strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text style={[styles.optionTitle, { color: theme.text.primary }]}>
                        Start New Shift
                      </Text>
                      <Text style={[styles.optionDescription, { color: theme.text.tertiary }]}>
                        Close current shift and start fresh
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.accent.primary} />
                <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
                  Processing...
                </Text>
              </View>
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
    textAlign: 'center',
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
  shiftInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  shiftInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  shiftInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  options: {
    gap: 12,
  },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionContent: {
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

