import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedLogo from '@/components/AnimatedLogo';
import { useBusiness } from '@/contexts/BusinessContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<any>;
  iconGradient?: [string, string];
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  showLogo?: boolean; // Option to show/hide animated logo
}

export default function PageHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconGradient = ['#0066CC', '#6366F1'],
  leftAction,
  rightAction,
  showLogo = true, // Show logo by default
}: PageHeaderProps) {
  const { theme, isDark } = useTheme();
  const { isEmployee, currentEmployee, business } = useBusiness();
  const headerGradient = isDark
    ? [theme.background.secondary, theme.background.tertiary] as [string, string]
    : (theme.gradient.primary as [string, string]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background.primary }]}>
      <LinearGradient
        colors={headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {leftAction && (
              <View style={styles.headerLeftAction}>
                {leftAction}
              </View>
            )}
            {/* Show animated logo if enabled, otherwise show icon */}
            {showLogo ? (
              <AnimatedLogo 
                size={40} 
                showGradient={true}
                rotationSpeed={4000}
                pulseEnabled={true}
                style={{ marginRight: 12 }}
              />
            ) : (
              Icon && (
                <LinearGradient
                  colors={iconGradient}
                  style={styles.headerIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon size={28} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              )
            )}
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && (
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              )}
              {isEmployee && (
                <View style={styles.employeeBadge}>
                  <Text style={styles.employeeBadgeText} numberOfLines={1}>
                    Assigned • {business?.name || 'Business'} • {currentEmployee?.roleName || 'Employee'}
                  </Text>
                </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
  },
  headerGradient: {
    paddingTop: 12,
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
  headerLeftAction: {
    marginRight: 12,
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
  employeeBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  employeeBadgeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600' as const,
  },
  headerRight: {
    marginLeft: 12,
  },
});

