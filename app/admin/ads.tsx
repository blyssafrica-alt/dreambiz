import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Megaphone, TrendingUp, Eye, MousePointerClick } from 'lucide-react-native';
import type { Advertisement } from '@/types/super-admin';

export default function AdsManagementScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setAds(data.map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          type: row.type,
          imageUrl: row.image_url,
          videoUrl: row.video_url,
          thumbnailUrl: row.thumbnail_url,
          headline: row.headline,
          bodyText: row.body_text,
          ctaText: row.cta_text || 'Learn More',
          ctaUrl: row.cta_url,
          ctaAction: row.cta_action,
          ctaTargetId: row.cta_target_id,
          targeting: row.targeting || {},
          placement: row.placement || {},
          startDate: row.start_date,
          endDate: row.end_date,
          timezone: row.timezone || 'Africa/Harare',
          status: row.status,
          impressionsCount: row.impressions_count || 0,
          clicksCount: row.clicks_count || 0,
          conversionsCount: row.conversions_count || 0,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })));
      }
    } catch (error) {
      console.error('Failed to load ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCTR = (ad: Advertisement) => {
    if (ad.impressionsCount === 0) return 0;
    return ((ad.clicksCount / ad.impressionsCount) * 100).toFixed(2);
  };

  const getConversionRate = (ad: Advertisement) => {
    if (ad.clicksCount === 0) return 0;
    return ((ad.conversionsCount / ad.clicksCount) * 100).toFixed(2);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>
          Advertisement Management
        </Text>
        <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Ad creation UI coming soon')}>
          <Plus size={24} color={theme.accent.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {ads.length === 0 ? (
          <View style={styles.emptyState}>
            <Megaphone size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              No advertisements yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text.tertiary }]}>
              Create your first ad to get started
            </Text>
          </View>
        ) : (
          ads.map((ad) => (
            <View
              key={ad.id}
              style={[styles.adCard, { backgroundColor: theme.background.card }]}
            >
              <View style={styles.adHeader}>
                <View style={styles.adInfo}>
                  <Text style={[styles.adTitle, { color: theme.text.primary }]}>
                    {ad.title}
                  </Text>
                  {ad.headline && (
                    <Text style={[styles.adHeadline, { color: theme.text.secondary }]}>
                      {ad.headline}
                    </Text>
                  )}
                  <View style={styles.adMeta}>
                    <View style={[styles.badge, { 
                      backgroundColor: ad.status === 'active' ? '#10B98120' : '#64748B20' 
                    }]}>
                      <Text style={[styles.badgeText, { 
                        color: ad.status === 'active' ? '#10B981' : '#64748B' 
                      }]}>
                        {ad.status}
                      </Text>
                    </View>
                    <Text style={[styles.adType, { color: theme.text.secondary }]}>
                      {ad.type}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.adStats}>
                <View style={styles.stat}>
                  <Eye size={16} color={theme.text.secondary} />
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    {ad.impressionsCount.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                    Impressions
                  </Text>
                </View>
                <View style={styles.stat}>
                  <MousePointerClick size={16} color={theme.text.secondary} />
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    {ad.clicksCount.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                    Clicks ({getCTR(ad)}%)
                  </Text>
                </View>
                <View style={styles.stat}>
                  <TrendingUp size={16} color={theme.text.secondary} />
                  <Text style={[styles.statValue, { color: theme.text.primary }]}>
                    {ad.conversionsCount.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.text.secondary }]}>
                    Conversions ({getConversionRate(ad)}%)
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  adCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  adHeader: {
    marginBottom: 16,
  },
  adInfo: {
    flex: 1,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  adHeadline: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  adMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  adType: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  adStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
});

