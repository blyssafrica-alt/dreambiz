import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, AlertTriangle, TrendingUp, Users, Activity, ExternalLink, CheckCircle, XCircle, BarChart3, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMonitoringStatus, getSentryStats, getPostHogStats } from '@/lib/monitoring-api';
import { Stack } from 'expo-router';

interface MonitoringStatus {
  sentryConfigured: boolean;
  posthogConfigured: boolean;
  sentryAuthTokenConfigured: boolean;
}

interface SentryStats {
  totalErrors: number;
  unresolvedErrors: number;
  errorsLast24h: number;
  recentErrors: Array<{
    id: string;
    title: string;
    count: number;
    lastSeen: string;
    level: string;
    status: string;
  }>;
}

interface PostHogStats {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  totalEvents: number;
  topEvents: Array<{
    event: string;
    count: number;
    lastSeen: string;
  }>;
}

export default function MonitoringScreen() {
  const { theme } = useTheme();
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<MonitoringStatus | null>(null);
  const [sentryStats, setSentryStats] = useState<SentryStats | null>(null);
  const [posthogStats, setPosthogStats] = useState<PostHogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const monitoringStatus = getMonitoringStatus();
      setStatus(monitoringStatus);

      // Load stats (these may return null if API tokens aren't configured)
      const [sentryData, posthogData] = await Promise.all([
        getSentryStats(),
        getPostHogStats(),
      ]);

      setSentryStats(sentryData);
      setPosthogStats(posthogData);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!isSuperAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
        <Stack.Screen options={{ title: 'Monitoring & Analytics', headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent.primary} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading monitoring data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'Monitoring & Analytics', headerShown: false }} />
      
      {/* Header */}
      <LinearGradient
        colors={[`${theme.accent.primary}10`, 'transparent']}
        style={styles.headerGradient}
      >
        <View style={[styles.header, { backgroundColor: theme.background.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Monitoring & Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent.primary}
            colors={[theme.accent.primary]}
          />
        }
      >
        {/* Configuration Status */}
        <View style={[styles.section, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Configuration Status</Text>
          
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={styles.statusIconContainer}>
                {status?.sentryConfigured ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <XCircle size={20} color="#EF4444" />
                )}
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={[styles.statusLabel, { color: theme.text.secondary }]}>Sentry</Text>
                <Text style={[styles.statusValue, { color: theme.text.primary }]}>
                  {status?.sentryConfigured ? 'Configured' : 'Not Configured'}
                </Text>
              </View>
              {status?.sentryConfigured && (
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://sentry.io')}
                  style={styles.externalLinkButton}
                >
                  <ExternalLink size={16} color={theme.accent.primary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.statusItem}>
              <View style={styles.statusIconContainer}>
                {status?.posthogConfigured ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <XCircle size={20} color="#EF4444" />
                )}
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={[styles.statusLabel, { color: theme.text.secondary }]}>PostHog</Text>
                <Text style={[styles.statusValue, { color: theme.text.primary }]}>
                  {status?.posthogConfigured ? 'Configured' : 'Not Configured'}
                </Text>
              </View>
              {status?.posthogConfigured && (
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://posthog.com')}
                  style={styles.externalLinkButton}
                >
                  <ExternalLink size={16} color={theme.accent.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {!status?.sentryAuthTokenConfigured && status?.sentryConfigured && (
            <View style={[styles.warningBanner, { backgroundColor: `${theme.accent.warning}15` }]}>
              <AlertTriangle size={16} color={theme.accent.warning} />
              <Text style={[styles.warningText, { color: theme.text.secondary }]}>
                Add EXPO_PUBLIC_SENTRY_AUTH_TOKEN to .env to view detailed error stats
              </Text>
            </View>
          )}
        </View>

        {/* Sentry Error Tracking */}
        {status?.sentryConfigured && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.sectionIcon}
                >
                  <AlertTriangle size={20} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Error Tracking (Sentry)</Text>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://sentry.io')}
                style={styles.viewAllButton}
              >
                <Text style={[styles.viewAllText, { color: theme.accent.primary }]}>View All</Text>
                <ExternalLink size={14} color={theme.accent.primary} />
              </TouchableOpacity>
            </View>

            {sentryStats ? (
              <>
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: `${theme.accent.primary}08` }]}>
                    <Text style={[styles.statValue, { color: theme.text.primary }]}>
                      {sentryStats.totalErrors}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Errors</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: `${theme.accent.danger}08` }]}>
                    <Text style={[styles.statValue, { color: theme.accent.danger }]}>
                      {sentryStats.unresolvedErrors}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Unresolved</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: `${theme.accent.warning}08` }]}>
                    <Text style={[styles.statValue, { color: theme.accent.warning }]}>
                      {sentryStats.errorsLast24h}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Last 24h</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                  Configure EXPO_PUBLIC_SENTRY_AUTH_TOKEN to view error statistics
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                  Or view errors directly on Sentry.io
                </Text>
              </View>
            )}
          </View>
        )}

        {/* PostHog Analytics */}
        {status?.posthogConfigured && (
          <View style={[styles.section, { backgroundColor: theme.background.card }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <LinearGradient
                  colors={[theme.accent.primary, `${theme.accent.primary}DD`]}
                  style={styles.sectionIcon}
                >
                  <BarChart3 size={20} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Analytics (PostHog)</Text>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://posthog.com')}
                style={styles.viewAllButton}
              >
                <Text style={[styles.viewAllText, { color: theme.accent.primary }]}>View All</Text>
                <ExternalLink size={14} color={theme.accent.primary} />
              </TouchableOpacity>
            </View>

            {posthogStats ? (
              <>
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: `${theme.accent.primary}08` }]}>
                    <Text style={[styles.statValue, { color: theme.text.primary }]}>
                      {posthogStats.totalUsers}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Users</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: `${theme.accent.primary}08` }]}>
                    <Text style={[styles.statValue, { color: theme.text.primary }]}>
                      {posthogStats.activeUsers24h}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Active (24h)</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: `${theme.accent.primary}08` }]}>
                    <Text style={[styles.statValue, { color: theme.text.primary }]}>
                      {posthogStats.totalEvents}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Events</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: theme.background.secondary }]}>
                <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                  View detailed analytics on PostHog.com
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
                  Real-time stats will be available here soon
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Quick Links */}
        <View style={[styles.section, { backgroundColor: theme.background.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Quick Links</Text>
          
          {status?.sentryConfigured && (
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: theme.background.secondary }]}
              onPress={() => Linking.openURL('https://sentry.io')}
            >
              <View style={styles.linkContent}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.linkIcon}
                >
                  <AlertTriangle size={20} color="#FFF" />
                </LinearGradient>
                <View style={styles.linkTextContainer}>
                  <Text style={[styles.linkTitle, { color: theme.text.primary }]}>Sentry Dashboard</Text>
                  <Text style={[styles.linkSubtitle, { color: theme.text.secondary }]}>View errors, issues, and performance</Text>
                </View>
                <ExternalLink size={20} color={theme.text.tertiary} />
              </View>
            </TouchableOpacity>
          )}

          {status?.posthogConfigured && (
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: theme.background.secondary }]}
              onPress={() => Linking.openURL('https://posthog.com')}
            >
              <View style={styles.linkContent}>
                <LinearGradient
                  colors={[theme.accent.primary, `${theme.accent.primary}DD`]}
                  style={styles.linkIcon}
                >
                  <BarChart3 size={20} color="#FFF" />
                </LinearGradient>
                <View style={styles.linkTextContainer}>
                  <Text style={[styles.linkTitle, { color: theme.text.primary }]}>PostHog Dashboard</Text>
                  <Text style={[styles.linkSubtitle, { color: theme.text.secondary }]}>View analytics, events, and user behavior</Text>
                </View>
                <ExternalLink size={20} color={theme.text.tertiary} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: -40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  externalLinkButton: {
    padding: 8,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  linkCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkTextContainer: {
    flex: 1,
    gap: 4,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkSubtitle: {
    fontSize: 13,
  },
});

