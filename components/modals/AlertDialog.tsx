import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import CustomModal from './CustomModal';
import { useTheme } from '@/contexts/ThemeContext';

export type AlertType = 'info' | 'warning' | 'error' | 'success';

interface AlertDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: AlertType;
  buttonText?: string;
}

export default function AlertDialog({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'Got it',
}: AlertDialogProps) {
  const { theme } = useTheme();

  const getIcon = () => {
    const size = 64;
    switch (type) {
      case 'success':
        return <CheckCircle size={size} color={theme.accent.success} />;
      case 'warning':
        return <AlertTriangle size={size} color={theme.accent.warning} />;
      case 'error':
        return <AlertCircle size={size} color={theme.accent.danger} />;
      default:
        return <Info size={size} color={theme.accent.info} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return theme.surface.success;
      case 'warning':
        return theme.surface.warning;
      case 'error':
        return theme.surface.danger;
      default:
        return theme.surface.info;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return theme.accent.success;
      case 'warning':
        return theme.accent.warning;
      case 'error':
        return theme.accent.danger;
      default:
        return theme.accent.primary;
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
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: theme.background.secondary }]}
          onPress={onClose}
        >
          <X size={20} color={theme.text.tertiary} />
        </TouchableOpacity>

        <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor() }]}>
          {getIcon()}
        </View>

        <Text style={[styles.title, { color: theme.text.primary }]}>
          {title}
        </Text>

        <Text style={[styles.message, { color: theme.text.secondary }]}>
          {message}
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: getButtonColor() }]}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
