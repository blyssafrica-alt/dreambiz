import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import CustomModal from './CustomModal';
import { useTheme } from '@/contexts/ThemeContext';

interface LoadingDialogProps {
  visible: boolean;
  message?: string;
}

export default function LoadingDialog({
  visible,
  message = 'Please wait...',
}: LoadingDialogProps) {
  const { theme } = useTheme();

  return (
    <CustomModal
      visible={visible}
      onClose={() => {}}
      showClose={false}
      animationType="fade"
      height="auto"
    >
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.message, { color: theme.text.primary }]}>
          {message}
        </Text>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 48,
    alignItems: 'center',
    gap: 20,
  },
  message: {
    fontSize: 17,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
