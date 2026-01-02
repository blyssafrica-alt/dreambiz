import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, AlertTriangle, TrendingUp, Users, Activity, ExternalLink, CheckCircle, XCircle, BarChart3, Zap, Shield, Eye, Clock, AlertCircle as AlertIcon, Sparkles, Server, ActivitySquare } from 'lucide-react-native';
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
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const monitoringStatus = getMonitoringStatus();
      setStatus(monitoringStatus);

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
          <LinearGradient
            colors={[theme.accent.primary, `${theme.accent.primary}DD`]}
            style={styles.loadingIcon}
          >
            <ActivitySquare size={32} color="#FFF" />
          </LinearGradient>
          <ActivityIndicator size="large" color={theme.accent.primary} style={{ marginTop: 16 }} />
          <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading monitoring data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background.secondary }]} edges={['top']}>
      <Stack.Screen options={{ title: 'Monitoring & Analytics', headerShown: false }} />
      
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={[`${theme.accent.primary}20`, `${theme.accent.primary}08`, 'transparent']}
        style={styles.headerGradient}
      >
        <View style={[styles.header, { backgroundColor: theme.background.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} activeOpacity={0.7}>
            <LinearGradient
              colors={[theme.background.secondary, theme.background.card]}
              style={styles.backButtonGradient}
            >
              <ArrowLeft size={20} color={theme.text.primary} />
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconContainer}>
              <LinearGradient
                colors={[theme.accent.primary, `${theme.accent.primary}DD`]}
                style={styles.headerMainIcon}
              >
                <ActivitySquare size={22} color="#FFF" />
              </LinearGradient>
              <View style={[styles.pulseDot, { backgroundColor: theme.accent.primary }]} />
            </View>
            <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Monitoring & Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: theme.text.secondary }]}>Real-time insights & error tracking</Text>
          </View>
          <View style={{ width: 56 }} />
        </View>
      </LinearGradient>

      <Animated.View style={[styles.animatedContent, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent.primary}
              colors={[theme.accent.primary]}
            />
          }
        >
          {/* Service Status Cards */}
          <View style={styles.statusSection}>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Service Status</Text>
            <View style={styles.statusGrid}>
              {/* Sentry Status Card */}
              <LinearGradient
                colors={status?.sentryConfigured 
                  ? ['#EF4444', '#DC2626'] 
                  : [`${theme.text.tertiary}20`, `${theme.text.tertiary}10`]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusCard}
              >
                <View style={styles.statusCardContent}>
                  <View style={styles.statusCardHeader}>
                    <View style={[styles.statusIconWrapper, { backgroundColor: status?.sentryConfigured ? '#FFF' : theme.background.secondary }]}>
                      <Shield size={24} color={status?.sentryConfigured ? '#EF4444' : theme.text.tertiary} />
                    </View>
                    {status?.sentryConfigured && (
                      <View style={styles.liveBadge}>
                        <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.statusCardTitle, { color: status?.sentryConfigured ? '#FFF' : theme.text.primary }]}>
                    Sentry
                  </Text>
                  <Text style={[styles.statusCardSubtitle, { color: status?.sentryConfigured ? '#FFF9' : theme.text.secondary }]}>
                    Error Tracking
                  </Text>
                  <View style={styles.statusIndicator}>
                    {status?.sentryConfigured ? (
                      <CheckCircle size={18} color="#FFF" />
                    ) : (
                      <XCircle size={18} color={theme.text.tertiary} />
                    )}
                    <Text style={[styles.statusText, { color: status?.sentryConfigured ? '#FFF' : theme.text.secondary }]}>
                      {status?.sentryConfigured ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  {status?.sentryConfigured && (
                    <TouchableOpacity
                      style={styles.statusActionButton}
                      onPress={() => Linking.openURL('https://sentry.io')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.statusActionText}>View Dashboard</Text>
                      <ExternalLink size={14} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>

              {/* PostHog Status Card */}
              <LinearGradient
                colors={status?.posthogConfigured 
                  ? [theme.accent.primary, `${theme.accent.primary}DD`] 
                  : [`${theme.text.tertiary}20`, `${theme.text.tertiary}10`]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statusCard}
              >
                <View style={styles.statusCardContent}>
                  <View style={styles.statusCardHeader}>
                    <View style={[styles.statusIconWrapper, { backgroundColor: status?.posthogConfigured ? '#FFF' : theme.background.secondary }]}>
                      <BarChart3 size={24} color={status?.posthogConfigured ? theme.accent.primary : theme.text.tertiary} />
                    </View>
                    {status?.posthogConfigured && (
                      <View style={styles.liveBadge}>
                        <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.statusCardTitle, { color: status?.posthogConfigured ? '#FFF' : theme.text.primary }]}>
                    PostHog
                  </Text>
                  <Text style={[styles.statusCardSubtitle, { color: status?.posthogConfigured ? '#FFF9' : theme.text.secondary }]}>
                    Analytics
                  </Text>
                  <View style={styles.statusIndicator}>
                    {status?.posthogConfigured ? (
                      <CheckCircle size={18} color="#FFF" />
                    ) : (
                      <XCircle size={18} color={theme.text.tertiary} />
                    )}
                    <Text style={[styles.statusText, { color: status?.posthogConfigured ? '#FFF' : theme.text.secondary }]}>
                      {status?.posthogConfigured ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  {status?.posthogConfigured && (
                    <TouchableOpacity
                      style={styles.statusActionButton}
                      onPress={() => Linking.openURL('https://posthog.com')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.statusActionText}>View Dashboard</Text>
                      <ExternalLink size={14} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Sentry Error Tracking Section */}
          {status?.sentryConfigured && (
            <View style={[styles.mainSection, { backgroundColor: theme.background.card }]}>
              <LinearGradient
                colors={['#EF444415', 'transparent']}
                style={styles.sectionHeaderGradient}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      style={styles.sectionIcon}
                    >
                      <AlertTriangle size={22} color="#FFF" />
                    </LinearGradient>
                    <View>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Error Tracking</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>Sentry monitoring</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://sentry.io')}
                    style={styles.externalButton}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.externalButtonText, { color: theme.accent.primary }]}>View All</Text>
                    <ExternalLink size={16} color={theme.accent.primary} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {sentryStats ? (
                <View style={styles.statsGrid}>
                  <LinearGradient
                    colors={[`${theme.accent.primary}15`, `${theme.accent.primary}08`]}
                    style={styles.statCard}
                  >
                    <View style={styles.statCardInner}>
                      <View style={[styles.statIconContainer, { backgroundColor: `${theme.accent.primary}20` }]}>
                        <AlertTriangle size={20} color={theme.accent.primary} />
                      </View>
                      <Text style={[styles.statValue, { color: theme.text.primary }]}>
                        {sentryStats.totalErrors.toLocaleString()}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Errors</Text>
                    </View>
                  </LinearGradient>

                  <LinearGradient
                    colors={['#EF444415', '#EF444408']}
                    style={styles.statCard}
                  >
                    <View style={styles.statCardInner}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#EF444420' }]}>
                        <AlertIcon size={20} color="#EF4444" />
                      </View>
                      <Text style={[styles.statValue, { color: '#EF4444' }]}>
                        {sentryStats.unresolvedErrors.toLocaleString()}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Unresolved</Text>
                    </View>
                  </LinearGradient>

                  <LinearGradient
                    colors={['#F59E0B15', '#F59E0B08']}
                    style={styles.statCard}
                  >
                    <View style={styles.statCardInner}>
                      <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B20' }]}>
                        <Clock size={20} color="#F59E0B" />
                      </View>
                      <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                        {sentryStats.errorsLast24h.toLocaleString()}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Last 24h</Text>
                    </View>
                  </LinearGradient>
                </View>
              ) : (
                <View style={[styles.emptyState, { backgroundColor: theme.background.secondary }]}>
                  <LinearGradient
                    colors={[`${theme.accent.primary}10`, 'transparent']}
                    style={styles.emptyIconContainer}
                  >
                    <Server size={32} color={theme.text.tertiary} />
                  </LinearGradient>
                  <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>Configure API Token</Text>
                  <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                    Add EXPO_PUBLIC_SENTRY_AUTH_TOKEN to view detailed statistics
                  </Text>
                  <TouchableOpacity
                    style={[styles.configureButton, { backgroundColor: theme.accent.primary }]}
                    onPress={() => Linking.openURL('https://sentry.io/settings/account/api/auth-tokens/')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.configureButtonText}>Get API Token</Text>
                    <ExternalLink size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* PostHog Analytics Section */}
          {status?.posthogConfigured && (
            <View style={[styles.mainSection, { backgroundColor: theme.background.card }]}>
              <LinearGradient
                colors={[`${theme.accent.primary}15`, 'transparent']}
                style={styles.sectionHeaderGradient}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <LinearGradient
                      colors={[theme.accent.primary, `${theme.accent.primary}DD`]}
                      style={styles.sectionIcon}
                    >
                      <BarChart3 size={22} color="#FFF" />
                    </LinearGradient>
                    <View>
                      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Analytics</Text>
                      <Text style={[styles.sectionSubtitle, { color: theme.text.secondary }]}>PostHog insights</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('https://posthog.com')}
                    style={[styles.externalButton, { backgroundColor: `${theme.accent.primary}10` }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.externalButtonText, { color: theme.accent.primary }]}>View All</Text>
                    <ExternalLink size={16} color={theme.accent.primary} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {posthogStats ? (
                <View style={styles.statsGrid}>
                  <LinearGradient
                    colors={[`${theme.accent.primary}15`, `${theme.accent.primary}08`]}
                    style={styles.statCard}
                  >
                    <View style={styles.statCardInner}>
                      <View style={[styles.statIconContainer, { backgroundColor: `${theme.accent.primary}20` }]}>
                        <Users size={20} color={theme.accent.primary} />
                      </View>
                      <Text style={[styles.statValue, { color: theme.text.primary }]}>
                        {posthogStats.totalUsers.toLocaleString()}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Users</Text>
                    </View>
                  </LinearGradient>

                  <LinearGradient
                    colors={[`${theme.accent.primary}15`, `${theme.accent.primary}08`]}
                    style={styles.statCard}
                  >
                    <View style={styles.statCardInner}>
                      <View style={[styles.statIconContainer, { backgroundColor: `${theme.accent.primary}20` }]}>
                        <Activity size={20} color={theme.accent.primary} />
                      </View>
                      <Text style={[styles.statValue, { color: theme.text.primary }]}>
                        {posthogStats.activeUsers24h.toLocaleString()}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Active (24h)</Text>
                    </View>
                  </LinearGradient>

                  <LinearGradient
                    colors={[`${theme.accent.primary}15`, `${theme.accent.primary}08`]}
                    style={styles.statCard}
                  >
                    <View style={styles.statCardInner}>
                      <View style={[styles.statIconContainer, { backgroundColor: `${theme.accent.primary}20` }]}>
                        <Sparkles size={20} color={theme.accent.primary} />
                      </View>
                      <Text style={[styles.statValue, { color: theme.text.primary }]}>
                        {posthogStats.totalEvents.toLocaleString()}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Total Events</Text>
                    </View>
                  </LinearGradient>
                </View>
              ) : (
                <View style={[styles.emptyState, { backgroundColor: theme.background.secondary }]}>
                  <LinearGradient
                    colors={[`${theme.accent.primary}10`, 'transparent']}
                    style={styles.emptyIconContainer}
                  >
                    <BarChart3 size={32} color={theme.text.tertiary} />
                  </LinearGradient>
                  <Text style={[styles.emptyTitle, { color: theme.text.primary }]}>View Analytics</Text>
                  <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                    Detailed analytics are available on PostHog dashboard
                  </Text>
                  <TouchableOpacity
                    style={[styles.configureButton, { backgroundColor: theme.accent.primary }]}
                    onPress={() => Linking.openURL('https://posthog.com')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.configureButtonText}>Open Dashboard</Text>
                    <ExternalLink size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Quick Access Links */}
          <View style={[styles.mainSection, { backgroundColor: theme.background.card }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <LinearGradient
                  colors={[theme.accent.primary, `${theme.accent.primary}DD`]}
                  style={styles.sectionIcon}
                >
                  <Zap size={22} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Quick Access</Text>
              </View>
            </View>

            {status?.sentryConfigured && (
              <TouchableOpacity
                style={[styles.linkCard, { backgroundColor: theme.background.secondary }]}
                onPress={() => Linking.openURL('https://sentry.io')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.linkCardIcon}
                >
                  <Shield size={24} color="#FFF" />
                </LinearGradient>
                <View style={styles.linkCardContent}>
                  <Text style={[styles.linkCardTitle, { color: theme.text.primary }]}>Sentry Dashboard</Text>
                  <Text style={[styles.linkCardSubtitle, { color: theme.text.secondary }]}>
                    View errors, issues, performance metrics, and release tracking
                  </Text>
                </View>
                <View style={[styles.linkCardArrow, { backgroundColor: `${theme.accent.primary}15` }]}>
                  <ExternalLink size={18} color={theme.accent.primary} />
                </View>
              </TouchableOpacity>
            )}

            {status?.posthogConfigured && (
              <TouchableOpacity
                style={[styles.linkCard, { backgroundColor: theme.background.secondary }]}
                onPress={() => Linking.openURL('https://posthog.com')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[theme.accent.primary, `${theme.accent.primary}DD`]}
                  style={styles.linkCardIcon}
                >
                  <BarChart3 size={24} color="#FFF" />
                </LinearGradient>
                <View style={styles.linkCardContent}>
                  <Text style={[styles.linkCardTitle, { color: theme.text.primary }]}>PostHog Dashboard</Text>
                  <Text style={[styles.linkCardSubtitle, { color: theme.text.secondary }]}>
                    View analytics, user behavior, events, funnels, and insights
                  </Text>
                </View>
                <View style={[styles.linkCardArrow, { backgroundColor: `${theme.accent.primary}15` }]}>
                  <ExternalLink size={18} color={theme.accent.primary} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  headerMainIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  pulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  animatedContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statusCardContent: {
    padding: 18,
    gap: 12,
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statusCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF3',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  statusActionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  mainSection: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeaderGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  externalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  externalButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardInner: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    margin: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  configureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  configureButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
    marginHorizontal: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  linkCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  linkCardContent: {
    flex: 1,
    gap: 4,
  },
  linkCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  linkCardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  linkCardArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
