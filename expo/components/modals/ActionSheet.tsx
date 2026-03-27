import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import CustomModal from './CustomModal';
import { useTheme } from '@/contexts/ThemeContext';

export interface ActionSheetOption {
  id: string;
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
}

export default function ActionSheet({
  visible,
  onClose,
  title,
  message,
  options,
}: ActionSheetProps) {
  const { theme } = useTheme();

  const handleOptionPress = (option: ActionSheetOption) => {
    if (!option.disabled) {
      option.onPress();
      onClose();
    }
  };

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      title={title}
      showClose={!!title}
      animationType="slide"
      height="auto"
    >
      <View style={styles.container}>
        {!title && message && (
          <View style={styles.messageContainer}>
            <Text style={[styles.message, { color: theme.text.secondary }]}>
              {message}
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.optionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {options.map((option, index) => {
            const Icon = option.icon;
            const isDestructive = option.destructive;
            const isDisabled = option.disabled;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.option,
                  {
                    backgroundColor: theme.background.secondary,
                    borderBottomColor: theme.border.light,
                  },
                  index === 0 && styles.firstOption,
                  index === options.length - 1 && styles.lastOption,
                  isDisabled && styles.disabledOption,
                ]}
                onPress={() => handleOptionPress(option)}
                disabled={isDisabled}
              >
                {Icon && (
                  <View style={[styles.iconContainer, {
                    backgroundColor: isDestructive 
                      ? theme.surface.danger 
                      : theme.background.tertiary,
                  }]}>
                    <Icon
                      size={22}
                      color={
                        isDisabled
                          ? theme.text.tertiary
                          : option.iconColor || 
                            (isDestructive ? theme.accent.danger : theme.accent.primary)
                      }
                    />
                  </View>
                )}
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isDisabled
                        ? theme.text.tertiary
                        : isDestructive
                        ? theme.accent.danger
                        : theme.text.primary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
          onPress={onClose}
        >
          <Text style={[styles.cancelText, { color: theme.text.primary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  messageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  optionsContainer: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  firstOption: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  lastOption: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 0,
  },
  disabledOption: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600' as const,
    flex: 1,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
});
