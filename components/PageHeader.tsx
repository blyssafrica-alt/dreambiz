import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import type { LucideIcon } from 'lucide-react-native';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<any>;
  iconGradient?: [string, string];
  rightAction?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconGradient = ['#0066CC', '#6366F1'],
  rightAction 
}: PageHeaderProps) {
  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={theme.gradient.primary as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {Icon && (
            <LinearGradient
              colors={iconGradient}
              style={styles.headerIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon size={28} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle && (
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
        {rightAction && (
          <View style={styles.headerRight}>
            {rightAction}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900' as const,
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as const,
  },
  headerRight: {
    marginLeft: 12,
  },
});

