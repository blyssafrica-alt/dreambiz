import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react-native';
import CustomModal from './CustomModal';
import { useTheme } from '@/contexts/ThemeContext';

export type ConfirmDialogType = 'info' | 'warning' | 'danger' | 'success';

interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  type?: ConfirmDialogType;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor,
  isLoading = false,
}: ConfirmDialogProps) {
  const { theme } = useTheme();

  const getIcon = () => {
    const size = 56;
    switch (type) {
      case 'success':
        return <CheckCircle size={size} color={theme.accent.success} />;
      case 'warning':
        return <AlertTriangle size={size} color={theme.accent.warning} />;
      case 'danger':
        return <AlertCircle size={size} color={theme.accent.danger} />;
      default:
        return <Info size={size} color={theme.accent.info} />;
    }
  };

  const getConfirmButtonColor = () => {
    if (confirmColor) return confirmColor;
    switch (type) {
      case 'success':
        return theme.accent.success;
      case 'warning':
        return theme.accent.warning;
      case 'danger':
        return theme.accent.danger;
      default:
        return theme.accent.primary;
    }
  };

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error('Confirm action failed:', error);
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      showClose={false}
      animationType="scale"
      height="auto"
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>

        <Text style={[styles.title, { color: theme.text.primary }]}>
          {title}
        </Text>

        <Text style={[styles.message, { color: theme.text.secondary }]}>
          {message}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.cancelButton,
              { backgroundColor: theme.background.secondary },
            ]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, { color: theme.text.secondary }]}>
              {cancelText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              { backgroundColor: getConfirmButtonColor() },
              isLoading && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                {confirmText}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 0,
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '700' as const,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
