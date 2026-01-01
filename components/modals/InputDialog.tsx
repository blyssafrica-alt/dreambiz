import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Edit3 } from 'lucide-react-native';
import CustomModal from './CustomModal';
import { useTheme } from '@/contexts/ThemeContext';

interface InputDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: 'text' | 'number' | 'email' | 'phone';
  multiline?: boolean;
  maxLength?: number;
  isLoading?: boolean;
}

export default function InputDialog({
  visible,
  onClose,
  onSubmit,
  title,
  message,
  placeholder = 'Enter value...',
  defaultValue = '',
  confirmText = 'Submit',
  cancelText = 'Cancel',
  inputType = 'text',
  multiline = false,
  maxLength,
  isLoading = false,
}: InputDialogProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible, defaultValue]);

  const getKeyboardType = () => {
    switch (inputType) {
      case 'number':
        return 'numeric';
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  const handleSubmit = async () => {
    if (!value.trim()) return;
    try {
      await onSubmit(value);
      onClose();
    } catch (error) {
      console.error('Submit failed:', error);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.surface.info }]}>
          <Edit3 size={32} color={theme.accent.primary} />
        </View>

        <Text style={[styles.title, { color: theme.text.primary }]}>
          {title}
        </Text>

        {message && (
          <Text style={[styles.message, { color: theme.text.secondary }]}>
            {message}
          </Text>
        )}

        <View style={[styles.inputContainer, { 
          backgroundColor: theme.background.secondary,
          borderColor: theme.border.light,
        }]}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { color: theme.text.primary },
              multiline && styles.multilineInput,
            ]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={theme.text.tertiary}
            keyboardType={getKeyboardType()}
            multiline={multiline}
            maxLength={maxLength}
            autoCapitalize={inputType === 'email' ? 'none' : 'sentences'}
            autoCorrect={inputType === 'email' ? false : true}
          />
          {maxLength && (
            <Text style={[styles.charCount, { color: theme.text.tertiary }]}>
              {value.length}/{maxLength}
            </Text>
          )}
        </View>

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
              { backgroundColor: theme.accent.primary },
              (!value.trim() || isLoading) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!value.trim() || isLoading}
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
      </KeyboardAvoidingView>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 12,
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
    opacity: 0.5,
  },
});
