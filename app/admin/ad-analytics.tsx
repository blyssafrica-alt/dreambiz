import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BarChart3, Users, TrendingUp, Target } from 'lucide-react-native';

type BreakdownItem = { label: string; count: number };
type AdBreakdownItem = {
  id: string;
  title: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  targetingSummary?: string;
};

type AnalyticsStats = {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalSpend: number;
  ctr: number;
  cvr: number;
  totalUsers: number;
  optedInUsers: number;
  genderBreakdown: BreakdownItem[];
  ageBreakdown: BreakdownItem[];
  interestBreakdown: BreakdownItem[];
  adBreakdown: AdBreakdownItem[];
};

const RANGE_OPTIONS = [7, 30, 90];

const getAgeBucket = (birthDate?: string | null) => {
  if (!birthDate) return 'Unknown';
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 18) return '13-17';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
};

const sortBreakdown = (items: BreakdownItem[]) =>
  [...items].sort((a, b) => b.count - a.count);

export default function AdAnalyticsScreen() {
  const { theme } = useTheme();
  const { isSuperAdmin, isAdmin, isModerator } = useAuth();
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);

  const canAccess = isSuperAdmin || isAdmin || isModerator;

  const loadAnalytics = useCallback(async () => {
    if (!canAccess) return;
    setIsLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - rangeDays);

      const { data: impressions, error: impressionsError } = await supabase
        .from('ad_impressions')
        .select('id, ad_id, user_id, viewed_at, clicked, converted')
        .gte('viewed_at', since.toISOString());

      if (impressionsError) throw impressionsError;

      const impressionRows = impressions || [];
      const adIds = Array.from(new Set(impressionRows.map(row => row.ad_id).filter(Boolean)));
      const userIds = Array.from(new Set(impressionRows.map(row => row.user_id).filter(Boolean)));

      const [adsResponse, usersResponse, allOptedInUsersResponse] = await Promise.all([
        adIds.length
          ? supabase.from('advertisements').select('id, title, spend_actual, clicks_count, conversions_count, billing_type, billing_rate, targeting').in('id', adIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length
          ? supabase
              .from('users')
              .select('id, gender, birth_date, interests, ad_tracking_consent, personalized_ads_consent')
              .in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
        // Get ALL opted-in users for demographics, not just those with impressions
        supabase
          .from('users')
          .select('id, gender, birth_date, interests, ad_tracking_consent, personalized_ads_consent')
          .or('ad_tracking_consent.eq.true,personalized_ads_consent.eq.true'),
      ]);

      if (adsResponse.error) throw adsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (allOptedInUsersResponse.error) throw allOptedInUsersResponse.error;

      const ads = adsResponse.data || [];
      const users = usersResponse.data || [];
      const allOptedInUsers = allOptedInUsersResponse.data || [];

      // Use aggregated counts from ads table for more accurate metrics
      const totalImpressions = impressionRows.length;
      const totalClicks = ads.reduce((sum, ad) => sum + (Number(ad.clicks_count) || 0), 0);
      const totalConversions = ads.reduce((sum, ad) => sum + (Number(ad.conversions_count) || 0), 0);
      const ctr = totalImpressions ? totalClicks / totalImpressions : 0;
      const cvr = totalClicks ? totalConversions / totalClicks : 0;

      const spendByAd = new Map<string, number>();
      const buildTargetingSummary = (targeting: any) => {
        if (!targeting) return '';
        const parts: string[] = [];
        if (Array.isArray(targeting.targetGenders) && targeting.targetGenders.length > 0) {
          parts.push(`Gender: ${targeting.targetGenders.map((g: string) => g.replace(/_/g, ' ')).join(', ')}`);
        }
        if (targeting.targetAgeMin !== undefined || targeting.targetAgeMax !== undefined) {
          const min = targeting.targetAgeMin;
          const max = targeting.targetAgeMax;
          if (min !== undefined && max !== undefined) {
            parts.push(`Age: ${min}-${max}`);
          } else if (min !== undefined) {
            parts.push(`Age: ${min}+`);
          } else if (max !== undefined) {
            parts.push(`Age: <=${max}`);
          }
        }
        if (Array.isArray(targeting.targetInterests) && targeting.targetInterests.length > 0) {
          const interests = targeting.targetInterests.slice(0, 3).join(', ');
          const suffix = targeting.targetInterests.length > 3
            ? ` +${targeting.targetInterests.length - 3}`
            : '';
          parts.push(`Interests: ${interests}${suffix}`);
        }
        if (parts.length > 0 && targeting.requireAdConsent !== false) {
          parts.push('Consent required');
        }
        return parts.join(' • ');
      };

      // Calculate spend: use spend_actual if available, otherwise calculate from billing rates
      ads.forEach(ad => {
        let spend = Number(ad.spend_actual) || 0;
        if (spend === 0 && ad.billing_type && ad.billing_rate) {
          const rate = Number(ad.billing_rate) || 0;
          const clicks = Number(ad.clicks_count) || 0;
          const conversions = Number(ad.conversions_count) || 0;
          if (ad.billing_type === 'cpc') {
            spend = clicks * rate;
          } else if (ad.billing_type === 'cpa') {
            spend = conversions * rate;
          } else if (ad.billing_type === 'cpe') {
            spend = (clicks + conversions) * rate;
          }
        }
        spendByAd.set(ad.id, spend);
      });
      const totalSpend = adIds.reduce((sum, adId) => sum + (spendByAd.get(adId) || 0), 0);

      // Build ad breakdown using aggregated counts from ads table
      const adStatsMap = new Map<string, AdBreakdownItem>();
      ads.forEach(ad => {
        const impressions = impressionRows.filter(row => row.ad_id === ad.id).length;
        adStatsMap.set(ad.id, {
          id: ad.id,
          title: ad.title || 'Untitled ad',
          impressions,
          clicks: Number(ad.clicks_count) || 0,
          conversions: Number(ad.conversions_count) || 0,
          spend: spendByAd.get(ad.id) || 0,
          targetingSummary: buildTargetingSummary(ad.targeting),
        });
      });

      // Use all opted-in users for demographics, not just those with impressions
      const optedInUsers = allOptedInUsers.filter(
        (user: any) => user.ad_tracking_consent || user.personalized_ads_consent
      );

      const genderCounts = new Map<string, number>();
      const ageCounts = new Map<string, number>();
      const interestCounts = new Map<string, number>();

      optedInUsers.forEach((user: any) => {
        // Only count users who have filled in their demographics
        if (!user.gender && !user.birth_date && (!user.interests || user.interests.length === 0)) {
          return; // Skip users with no demographic data
        }

        const gender = user.gender || 'Unknown';
        genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);

        const bucket = getAgeBucket(user.birth_date);
        ageCounts.set(bucket, (ageCounts.get(bucket) || 0) + 1);

        if (Array.isArray(user.interests)) {
          user.interests.forEach((interest: string) => {
            const trimmed = String(interest || '').trim();
            if (!trimmed) return;
            interestCounts.set(trimmed, (interestCounts.get(trimmed) || 0) + 1);
          });
        }
      });

      const genderBreakdown = sortBreakdown(
        Array.from(genderCounts.entries()).map(([label, count]) => ({ label, count }))
      );
      const ageBreakdown = sortBreakdown(
        Array.from(ageCounts.entries()).map(([label, count]) => ({ label, count }))
      );
      const interestBreakdown = sortBreakdown(
        Array.from(interestCounts.entries()).map(([label, count]) => ({ label, count }))
      ).slice(0, 10);

      const adBreakdown = Array.from(adStatsMap.values()).sort(
        (a, b) => b.impressions - a.impressions
      );

      setStats({
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend,
        ctr,
        cvr,
        totalUsers: allOptedInUsers.length, // All opted-in users, not just those with impressions
        optedInUsers: optedInUsers.length,
        genderBreakdown,
        ageBreakdown,
        interestBreakdown,
        adBreakdown,
      });
    } catch (error) {
      console.error('Failed to load ad analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [canAccess, rangeDays]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const consentRate = useMemo(() => {
    if (!stats || stats.totalUsers === 0) return 0;
    return stats.optedInUsers / stats.totalUsers;
  }, [stats]);

  if (!canAccess) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Ad Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterRow}>
          {RANGE_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterButton,
                {
                  backgroundColor: rangeDays === option ? theme.accent.primary : theme.background.card,
                  borderColor: theme.border.light,
                },
              ]}
              onPress={() => setRangeDays(option)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: rangeDays === option ? '#FFF' : theme.text.secondary },
                ]}
              >
                {option}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.accent.primary} />
            <Text style={[styles.loadingText, { color: theme.text.secondary }]}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}>
              <View style={styles.cardHeader}>
                <BarChart3 size={18} color={theme.accent.primary} />
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Performance</Text>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    {stats?.totalImpressions || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Impressions</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    {stats?.totalClicks || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Clicks</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    {stats?.totalConversions || 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Conversions</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    {((stats?.ctr || 0) * 100).toFixed(1)}%
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>CTR</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    {((stats?.cvr || 0) * 100).toFixed(1)}%
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>CVR</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    ${(stats?.totalSpend || 0).toFixed(2)}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>Spend</Text>
                </View>
              </View>
              <Text style={[styles.cardHint, { color: theme.text.tertiary }]}>
                Spend is based on current ad spend totals for ads active in the selected range.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}>
              <View style={styles.cardHeader}>
                <Users size={18} color={theme.accent.primary} />
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Audience consent</Text>
              </View>
              <Text style={[styles.cardHint, { color: theme.text.secondary }]}>
                {stats?.optedInUsers || 0} of {stats?.totalUsers || 0} users opted in ({(consentRate * 100).toFixed(0)}%).
              </Text>
              <Text style={[styles.cardHint, { color: theme.text.tertiary }]}>
                Demographics only include opted-in users.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}>
              <View style={styles.cardHeader}>
                <TrendingUp size={18} color={theme.accent.primary} />
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Gender</Text>
              </View>
              {stats?.genderBreakdown?.length ? (
                stats.genderBreakdown.map(item => (
                  <View key={item.label} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: theme.text.secondary }]}>{item.label}</Text>
                    <Text style={[styles.breakdownValue, { color: theme.text.primary }]}>{item.count}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.cardHint, { color: theme.text.tertiary }]}>No data yet.</Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}>
              <View style={styles.cardHeader}>
                <Target size={18} color={theme.accent.primary} />
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Age</Text>
              </View>
              {stats?.ageBreakdown?.length ? (
                stats.ageBreakdown.map(item => (
                  <View key={item.label} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: theme.text.secondary }]}>{item.label}</Text>
                    <Text style={[styles.breakdownValue, { color: theme.text.primary }]}>{item.count}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.cardHint, { color: theme.text.tertiary }]}>No data yet.</Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}>
              <View style={styles.cardHeader}>
                <Users size={18} color={theme.accent.primary} />
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Top interests</Text>
              </View>
              {stats?.interestBreakdown?.length ? (
                stats.interestBreakdown.map(item => (
                  <View key={item.label} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: theme.text.secondary }]}>{item.label}</Text>
                    <Text style={[styles.breakdownValue, { color: theme.text.primary }]}>{item.count}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.cardHint, { color: theme.text.tertiary }]}>No data yet.</Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}>
              <View style={styles.cardHeader}>
                <BarChart3 size={18} color={theme.accent.primary} />
                <Text style={[styles.cardTitle, { color: theme.text.primary }]}>Ad breakdown</Text>
              </View>
              {stats?.adBreakdown?.length ? (
                stats.adBreakdown.map(ad => (
                  <View key={ad.id} style={styles.adRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.adTitle, { color: theme.text.primary }]}>{ad.title}</Text>
                    <Text style={[styles.adMeta, { color: theme.text.secondary }]}>
                      {ad.impressions} impressions • {ad.clicks} clicks • {ad.conversions} conversions
                    </Text>
                    {ad.targetingSummary ? (
                      <Text style={[styles.adMeta, { color: theme.text.tertiary }]}>
                        {ad.targetingSummary}
                      </Text>
                    ) : null}
                    </View>
                    <Text style={[styles.adSpend, { color: theme.text.primary }]}>${ad.spend.toFixed(2)}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.cardHint, { color: theme.text.tertiary }]}>No data yet.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterButtonText: { fontSize: 13, fontWeight: '600' },
  loading: { alignItems: 'center', paddingVertical: 30 },
  loadingText: { marginTop: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardHint: { fontSize: 12, marginTop: 8 },
  statRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  statBlock: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: { fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: '600' },
  adRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  adTitle: { fontSize: 14, fontWeight: '600' },
  adMeta: { fontSize: 12, marginTop: 2 },
  adSpend: { fontSize: 13, fontWeight: '700' },
});

