import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showClose?: boolean;
  height?: number | 'auto' | 'full';
  animationType?: 'slide' | 'fade' | 'scale';
}

export default function CustomModal({
  visible,
  onClose,
  children,
  title,
  showClose = true,
  height = 'auto',
  animationType = 'slide',
}: CustomModalProps) {
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible) {
      if (animationType === 'slide') {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      } else if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (animationType === 'scale') {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      if (animationType === 'slide') {
        slideAnim.setValue(SCREEN_HEIGHT);
      } else if (animationType === 'fade') {
        fadeAnim.setValue(0);
      } else if (animationType === 'scale') {
        scaleAnim.setValue(0.3);
        fadeAnim.setValue(0);
      }
    }
  }, [visible, animationType, slideAnim, fadeAnim, scaleAnim]);

  const getContainerStyle = () => {
    if (animationType === 'slide') {
      return {
        transform: [{ translateY: slideAnim }],
      };
    } else if (animationType === 'fade') {
      return {
        opacity: fadeAnim,
      };
    } else if (animationType === 'scale') {
      return {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      };
    }
    return {};
  };

  const getHeightStyle = () => {
    if (height === 'full') return { height: SCREEN_HEIGHT };
    if (height === 'auto') return { maxHeight: SCREEN_HEIGHT * 0.9 };
    return { height };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark">
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={onClose}
            />
          </BlurView>
        ) : (
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, styles.androidOverlay]}
            activeOpacity={1}
            onPress={onClose}
          />
        )}

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.background.card,
              ...getHeightStyle(),
            },
            animationType === 'scale' && styles.centerContainer,
            getContainerStyle(),
          ]}
        >
          {title && (
            <View style={[styles.header, { borderBottomColor: theme.border.light }]}>
              <Text style={[styles.title, { color: theme.text.primary }]}>
                {title}
              </Text>
              {showClose && (
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeButton, { backgroundColor: theme.background.secondary }]}
                >
                  <Text style={[styles.closeText, { color: theme.text.secondary }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  androidOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 4,
  },
  centerContainer: {
    borderRadius: 28,
    margin: 20,
    alignSelf: 'center',
    width: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
});
