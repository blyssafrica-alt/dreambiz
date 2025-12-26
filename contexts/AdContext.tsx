import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Advertisement, AdImpression } from '@/types/super-admin';
import type { DreamBigBook, BusinessType, BusinessStage } from '@/types/business';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';
import { useFeatures } from './FeatureContext';

interface AdContextValue {
  ads: Advertisement[];
  isLoading: boolean;
  getAdsForLocation: (location: string) => Advertisement[];
  trackImpression: (adId: string, location: string) => Promise<void>;
  trackClick: (adId: string, location: string) => Promise<void>;
  trackConversion: (adId: string, location: string, value?: number) => Promise<void>;
  refreshAds: () => Promise<void>;
}

const AdContext = createContext<AdContextValue | undefined>(undefined);

import AsyncStorage from '@react-native-async-storage/async-storage';

// Generate or retrieve session ID
async function getSessionId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem('ad_session_id');
    if (stored) return stored;
  } catch (error) {
    // AsyncStorage not available, continue
  }
  
  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    await AsyncStorage.setItem('ad_session_id', newSessionId);
  } catch (error) {
    // AsyncStorage not available, continue
  }
  return newSessionId;
}

export function AdContextProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  const { business } = useBusiness();
  const { enabledFeatureIds } = useFeatures();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [impressionHistory, setImpressionHistory] = useState<AdImpression[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    getSessionId().then(setSessionId);
  }, []);

  const loadAds = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load active ads
      const query = supabase
        .from('advertisements')
        .select('*')
        .eq('status', 'active')
        .order('placement->priority', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const advertisements: Advertisement[] = data.map((row: any) => ({
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
        }));

        setAds(advertisements);
      }

      // Load impression history for this user
      if (user) {
        const { data: impressionsData } = await supabase
          .from('ad_impressions')
          .select('*')
          .eq('user_id', user.id);

        if (impressionsData) {
          setImpressionHistory(impressionsData.map((row: any) => ({
            id: row.id,
            adId: row.ad_id,
            userId: row.user_id,
            businessId: row.business_id,
            location: row.location,
            sessionId: row.session_id,
            viewedAt: row.viewed_at,
            clicked: row.clicked,
            clickedAt: row.clicked_at,
            converted: row.converted,
            convertedAt: row.converted_at,
            conversionValue: row.conversion_value ? parseFloat(row.conversion_value) : undefined,
            metadata: row.metadata,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load ads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const shouldShowAd = useCallback((ad: Advertisement): boolean => {
    // Check date range
    const now = new Date();
    if (ad.startDate && new Date(ad.startDate) > now) return false;
    if (ad.endDate && new Date(ad.endDate) < now) return false;

    const targeting = ad.targeting;
    const placement = ad.placement;

    // Check frequency limits
    const userImpressions = impressionHistory.filter(
      imp => imp.userId === user?.id && imp.adId === ad.id
    );

    if (placement.frequency === 'once_per_session') {
      const sessionImpressions = userImpressions.filter(
        imp => imp.sessionId === sessionId
      );
      if (sessionImpressions.length > 0) return false;
    }

    if (placement.frequency === 'once_per_day') {
      const today = new Date().toDateString();
      const todayImpressions = userImpressions.filter(
        imp => new Date(imp.viewedAt).toDateString() === today
      );
      if (todayImpressions.length > 0) return false;
    }

    if (placement.maxImpressionsPerUser) {
      if (userImpressions.length >= placement.maxImpressionsPerUser) {
        return false;
      }
    }

    // Check targeting rules
    if (targeting.scope === 'global') {
      // Check exclusions
      if (targeting.excludeUsers?.includes(user?.id || '')) {
        return false;
      }
      return true;
    }

    // Targeted ad - check all targeting criteria
    const userBook = business?.dreamBigBook;
    const businessType = business?.type;
    const businessStage = business?.stage;
    // Health score would need to be calculated from business metrics

    if (targeting.targetBooks && userBook) {
      if (!targeting.targetBooks.includes(userBook)) {
        return false;
      }
    }

    if (targeting.targetBusinessTypes && businessType) {
      if (!targeting.targetBusinessTypes.includes(businessType)) {
        return false;
      }
    }

    if (targeting.targetBusinessStages && businessStage) {
      if (!targeting.targetBusinessStages.includes(businessStage)) {
        return false;
      }
    }

    if (targeting.targetFeatures) {
      const hasAllFeatures = targeting.targetFeatures.every(
        feature => enabledFeatureIds.includes(feature)
      );
      if (!hasAllFeatures) return false;
    }

    return true;
  }, [user, business, enabledFeatureIds, impressionHistory, sessionId]);

  const getAdsForLocation = useCallback((location: string): Advertisement[] => {
    return ads
      .filter(ad => {
        // Check if ad should be shown in this location
        if (!ad.placement.locations?.includes(location)) return false;
        return shouldShowAd(ad);
      })
      .sort((a, b) => (b.placement.priority || 0) - (a.placement.priority || 0));
  }, [ads, shouldShowAd]);

  const trackImpression = useCallback(async (adId: string, location: string) => {
    if (!user || !business) return;

    try {
      const { data, error } = await supabase
        .from('ad_impressions')
        .insert({
          ad_id: adId,
          user_id: user.id,
          business_id: business.id,
          location,
          session_id: sessionId,
          viewed_at: new Date().toISOString(),
          clicked: false,
          converted: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local impression history
      if (data) {
        setImpressionHistory(prev => [...prev, {
          id: data.id,
          adId: data.ad_id,
          userId: data.user_id,
          businessId: data.business_id,
          location: data.location,
          sessionId: data.session_id,
          viewedAt: data.viewed_at,
          clicked: data.clicked,
          converted: data.converted,
        }]);
      }
    } catch (error) {
      console.error('Failed to track impression:', error);
    }
  }, [user, business, sessionId]);

  const trackClick = useCallback(async (adId: string, location: string) => {
    if (!user) return;

    try {
      // Find the most recent impression for this ad in this session
      const recentImpression = impressionHistory
        .filter(imp => imp.adId === adId && imp.sessionId === sessionId && imp.location === location)
        .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())[0];

      if (recentImpression && !recentImpression.clicked) {
        await supabase
          .from('ad_impressions')
          .update({
            clicked: true,
            clicked_at: new Date().toISOString(),
          })
          .eq('id', recentImpression.id);

        // Update local state
        setImpressionHistory(prev =>
          prev.map(imp =>
            imp.id === recentImpression.id
              ? { ...imp, clicked: true, clickedAt: new Date().toISOString() }
              : imp
          )
        );
      }
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  }, [user, impressionHistory, sessionId]);

  const trackConversion = useCallback(async (adId: string, location: string, value?: number) => {
    if (!user) return;

    try {
      // Find the most recent impression for this ad
      const recentImpression = impressionHistory
        .filter(imp => imp.adId === adId && imp.sessionId === sessionId)
        .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())[0];

      if (recentImpression && !recentImpression.converted) {
        await supabase
          .from('ad_impressions')
          .update({
            converted: true,
            converted_at: new Date().toISOString(),
            conversion_value: value,
          })
          .eq('id', recentImpression.id);

        // Update local state
        setImpressionHistory(prev =>
          prev.map(imp =>
            imp.id === recentImpression.id
              ? { ...imp, converted: true, convertedAt: new Date().toISOString(), conversionValue: value }
              : imp
          )
        );
      }
    } catch (error) {
      console.error('Failed to track conversion:', error);
    }
  }, [user, impressionHistory, sessionId]);

  const refreshAds = useCallback(async () => {
    await loadAds();
  }, [loadAds]);

  return (
    <AdContext.Provider
      value={{
        ads,
        isLoading,
        getAdsForLocation,
        trackImpression,
        trackClick,
        trackConversion,
        refreshAds,
      }}
    >
      {children}
    </AdContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAds must be used within an AdContextProvider');
  }
  return context;
}

