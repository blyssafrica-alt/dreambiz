import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Trash2, Edit, Share2, Download, Star, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfirmDialog, useAlertDialog, useInputDialog, useActionSheet } from '@/hooks/useModal';
import { ConfirmDialog, AlertDialog, InputDialog, ActionSheet } from '@/components/modals';

export default function ModalDemo() {
  const { theme } = useTheme();
  
  const confirmDialog = useConfirmDialog();
  const alertDialog = useAlertDialog();
  const inputDialog = useInputDialog();
  const actionSheet = useActionSheet();

  const handleConfirmExample = () => {
    confirmDialog.confirm({
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        console.log('Account deleted');
      },
    });
  };

  const handleAlertExample = () => {
    alertDialog.alert({
      title: 'Success!',
      message: 'Your payment has been processed successfully.',
      type: 'success',
      buttonText: 'Great!',
    });
  };

  const handleInputExample = () => {
    inputDialog.prompt({
      title: 'Rename Business',
      message: 'Enter a new name for your business',
      placeholder: 'Business name...',
      defaultValue: 'My Business',
      onSubmit: async (value) => {
        console.log('New name:', value);
      },
    });
  };

  const handleActionSheetExample = () => {
    actionSheet.show({
      title: 'Document Options',
      options: [
        {
          id: 'edit',
          label: 'Edit Document',
          icon: Edit,
          onPress: () => console.log('Edit'),
        },
        {
          id: 'share',
          label: 'Share',
          icon: Share2,
          onPress: () => console.log('Share'),
        },
        {
          id: 'download',
          label: 'Download',
          icon: Download,
          onPress: () => console.log('Download'),
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          destructive: true,
          onPress: () => console.log('Delete'),
        },
      ],
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text.primary }]}>
          Beautiful Modal Examples
        </Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Tap any button below to see the modal in action
        </Text>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent.danger }]}
            onPress={handleConfirmExample}
          >
            <AlertCircle size={20} color="#FFF" />
            <Text style={styles.buttonText}>Confirm Dialog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent.success }]}
            onPress={handleAlertExample}
          >
            <Star size={20} color="#FFF" />
            <Text style={styles.buttonText}>Alert Dialog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent.primary }]}
            onPress={handleInputExample}
          >
            <Edit size={20} color="#FFF" />
            <Text style={styles.buttonText}>Input Dialog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent.secondary }]}
            onPress={handleActionSheetExample}
          >
            <Share2 size={20} color="#FFF" />
            <Text style={styles.buttonText}>Action Sheet</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmDialog.visible}
        onClose={confirmDialog.hideModal}
        {...confirmDialog.props}
      />

      <AlertDialog
        visible={alertDialog.visible}
        onClose={alertDialog.hideModal}
        {...alertDialog.props}
      />

      <InputDialog
        visible={inputDialog.visible}
        onClose={inputDialog.hideModal}
        {...inputDialog.props}
      />

      <ActionSheet
        visible={actionSheet.visible}
        onClose={actionSheet.hideModal}
        {...actionSheet.props}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  section: {
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
