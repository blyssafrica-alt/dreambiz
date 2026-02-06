import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Advertisement, AdImpression, AdCampaign, AdSet } from '@/types/super-admin';
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
  consumeLastAdClick: (maxAgeMinutes?: number) => { adId: string; location: string } | null;
  refreshAds: () => Promise<void>;
  adSetsById: Record<string, AdSet>;
}

const AdContext = createContext<AdContextValue | undefined>(undefined);

import AsyncStorage from '@react-native-async-storage/async-storage';

const formatSupabaseError = (error: unknown) => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const getAgeFromBirthDate = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

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
  const [campaigns, setCampaigns] = useState<Record<string, AdCampaign>>({});
  const [adSets, setAdSets] = useState<Record<string, AdSet>>({});
  const [impressionHistory, setImpressionHistory] = useState<AdImpression[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');
  const [lastAdClick, setLastAdClick] = useState<{ adId: string; location: string; at: number } | null>(null);
  const [userDemographics, setUserDemographics] = useState<{
    gender?: string | null;
    birthDate?: string | null;
    interests: string[];
    adTrackingConsent?: boolean | null;
    personalizedAdsConsent?: boolean | null;
  } | null>(null);

  useEffect(() => {
    getSessionId().then(setSessionId);
  }, []);

  useEffect(() => {
    const loadDemographics = async () => {
      if (!user?.id) {
        setUserDemographics(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('gender, birth_date, interests, ad_tracking_consent, personalized_ads_consent')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setUserDemographics({
          gender: data?.gender || null,
          birthDate: data?.birth_date || null,
          interests: Array.isArray(data?.interests) ? data.interests : [],
          adTrackingConsent: data?.ad_tracking_consent,
          personalizedAdsConsent: data?.personalized_ads_consent,
        });
      } catch (error) {
        console.warn('Failed to load user demographics:', error);
        setUserDemographics({
          gender: null,
          birthDate: null,
          interests: [],
          adTrackingConsent: false,
          personalizedAdsConsent: false,
        });
      }
    };

    loadDemographics();
  }, [user?.id]);

  const loadCampaignsAndSets = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const [{ data: campaignsData }, { data: adSetsData }, { data: dailySpendData }] = await Promise.all([
      supabase.from('ad_campaigns').select('*').eq('status', 'active'),
      supabase.from('ad_sets').select('*').eq('status', 'active'),
      supabase.from('ad_set_daily_spend').select('ad_set_id, spend_amount').eq('spend_date', today),
    ]);

    const campaignMap: Record<string, AdCampaign> = {};
    (campaignsData || []).forEach((row: any) => {
      campaignMap[row.id] = {
        id: row.id,
        name: row.name,
        objective: row.objective || undefined,
        status: row.status,
        startDate: row.start_date || undefined,
        endDate: row.end_date || undefined,
        budget: row.budget !== null && row.budget !== undefined ? parseFloat(row.budget) : undefined,
        spendActual: row.spend_actual !== null && row.spend_actual !== undefined ? parseFloat(row.spend_actual) : undefined,
        currency: row.currency || 'USD',
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    const dailySpendMap: Record<string, number> = {};
    (dailySpendData || []).forEach((row: any) => {
      if (row.ad_set_id) {
        dailySpendMap[row.ad_set_id] = row.spend_amount !== null && row.spend_amount !== undefined ? parseFloat(row.spend_amount) : 0;
      }
    });

    const adSetMap: Record<string, AdSet> = {};
    (adSetsData || []).forEach((row: any) => {
      adSetMap[row.id] = {
        id: row.id,
        campaignId: row.campaign_id || undefined,
        name: row.name,
        status: row.status,
        startDate: row.start_date || undefined,
        endDate: row.end_date || undefined,
        budget: row.budget !== null && row.budget !== undefined ? parseFloat(row.budget) : undefined,
        spendActual: row.spend_actual !== null && row.spend_actual !== undefined ? parseFloat(row.spend_actual) : undefined,
        spendActualToday: dailySpendMap[row.id] ?? 0,
        currency: row.currency || 'USD',
        billingType: row.billing_type || 'cpc',
        billingRate: row.billing_rate !== null && row.billing_rate !== undefined ? parseFloat(row.billing_rate) : undefined,
        pacingEnabled: row.pacing_enabled || false,
        dailyBudget: row.daily_budget !== null && row.daily_budget !== undefined ? parseFloat(row.daily_budget) : undefined,
        attributionClickDays: row.attribution_click_days ?? undefined,
        attributionViewDays: row.attribution_view_days ?? undefined,
        optimizationGoal: row.optimization_goal || 'impressions',
        learningEventThreshold: row.learning_event_threshold ?? undefined,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    setCampaigns(campaignMap);
    setAdSets(adSetMap);
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
          autoRenew: row.auto_renew || false,
          timezone: row.timezone || 'Africa/Harare',
          status: row.status,
          impressionsCount: row.impressions_count || 0,
          clicksCount: row.clicks_count || 0,
          conversionsCount: row.conversions_count || 0,
          spend: row.spend !== null && row.spend !== undefined ? parseFloat(row.spend) : undefined,
          spendActual: row.spend_actual !== null && row.spend_actual !== undefined ? parseFloat(row.spend_actual) : undefined,
          spendCurrency: row.spend_currency || 'USD',
          billingType: row.billing_type || 'cpc',
          billingRate: row.billing_rate !== null && row.billing_rate !== undefined ? parseFloat(row.billing_rate) : undefined,
          campaignId: row.campaign_id || undefined,
          adSetId: row.ad_set_id || undefined,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        setAds(advertisements);
      }
      await loadCampaignsAndSets();

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
  }, [user, loadCampaignsAndSets]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const shouldShowAd = useCallback((ad: Advertisement): boolean => {
    // Check date range
    const now = new Date();
    if (ad.startDate && new Date(ad.startDate) > now) return false;
    if (ad.endDate && new Date(ad.endDate) < now) return false;

    if (ad.campaignId && campaigns[ad.campaignId]) {
      const campaign = campaigns[ad.campaignId];
      if (campaign.status !== 'active') return false;
      if (campaign.startDate && new Date(campaign.startDate) > now) return false;
      if (campaign.endDate && new Date(campaign.endDate) < now) return false;
      if (campaign.budget !== undefined && campaign.spendActual !== undefined && campaign.spendActual >= campaign.budget) {
        return false;
      }
    }

    if (ad.adSetId && adSets[ad.adSetId]) {
      const adSet = adSets[ad.adSetId];
      if (adSet.status !== 'active') return false;
      if (adSet.startDate && new Date(adSet.startDate) > now) return false;
      if (adSet.endDate && new Date(adSet.endDate) < now) return false;
      if (adSet.budget !== undefined && adSet.spendActual !== undefined && adSet.spendActual >= adSet.budget) {
        return false;
      }
      if (adSet.pacingEnabled && adSet.dailyBudget !== undefined && adSet.spendActualToday !== undefined) {
        if (adSet.spendActualToday >= adSet.dailyBudget) {
          return false;
        }
      }
    }

    // Stop serving if budget is exhausted
    if (ad.spend !== undefined && ad.spendActual !== undefined && ad.spendActual >= ad.spend) {
      return false;
    }

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

    const hasDemographicTargeting =
      (targeting.targetGenders && targeting.targetGenders.length > 0) ||
      targeting.targetAgeMin !== undefined ||
      targeting.targetAgeMax !== undefined ||
      (targeting.targetInterests && targeting.targetInterests.length > 0);
    const consentRequired = targeting.requireAdConsent !== false;
    const hasConsent = Boolean(
      userDemographics?.adTrackingConsent || userDemographics?.personalizedAdsConsent
    );

    if (hasDemographicTargeting && consentRequired && !hasConsent) {
      return false;
    }

    if (targeting.targetGenders && targeting.targetGenders.length > 0) {
      if (!userDemographics?.gender) return false;
      if (!targeting.targetGenders.includes(userDemographics.gender)) {
        return false;
      }
    }

    if (targeting.targetAgeMin !== undefined || targeting.targetAgeMax !== undefined) {
      const age = getAgeFromBirthDate(userDemographics?.birthDate);
      if (age === null) return false;
      if (targeting.targetAgeMin !== undefined && age < targeting.targetAgeMin) return false;
      if (targeting.targetAgeMax !== undefined && age > targeting.targetAgeMax) return false;
    }

    if (targeting.targetInterests && targeting.targetInterests.length > 0) {
      const userInterests = (userDemographics?.interests || []).map(item => item.toLowerCase());
      const targetInterests = targeting.targetInterests.map(item => item.toLowerCase());
      const hasMatch = targetInterests.some(interest => userInterests.includes(interest));
      if (!hasMatch) return false;
    }

    return true;
  }, [user, business, enabledFeatureIds, impressionHistory, sessionId, campaigns, adSets, userDemographics]);

  const getAdsForLocation = useCallback((location: string): Advertisement[] => {
    return ads
      .filter(ad => {
        // Check if ad should be shown in this location
        if (!ad.placement.locations?.includes(location)) return false;
        return shouldShowAd(ad);
      })
      .sort((a, b) => {
        const priorityDiff = (b.placement.priority || 0) - (a.placement.priority || 0);
        if (priorityDiff !== 0) return priorityDiff;

        const goalA = a.adSetId ? adSets[a.adSetId]?.optimizationGoal : undefined;
        const goalB = b.adSetId ? adSets[b.adSetId]?.optimizationGoal : undefined;
        const goal = goalA || goalB || 'impressions';

        const adSetA = a.adSetId ? adSets[a.adSetId] : undefined;
        const adSetB = b.adSetId ? adSets[b.adSetId] : undefined;
        const thresholdA = adSetA?.learningEventThreshold ?? 50;
        const thresholdB = adSetB?.learningEventThreshold ?? 50;

        const eventsA = goal === 'conversions' ? a.conversionsCount : a.clicksCount;
        const eventsB = goal === 'conversions' ? b.conversionsCount : b.clicksCount;

        const inLearningA = (goal !== 'impressions') && eventsA < thresholdA;
        const inLearningB = (goal !== 'impressions') && eventsB < thresholdB;

        if (inLearningA && !inLearningB) return 1;
        if (!inLearningA && inLearningB) return -1;

        const ctrA = a.impressionsCount ? a.clicksCount / a.impressionsCount : 0;
        const ctrB = b.impressionsCount ? b.clicksCount / b.impressionsCount : 0;
        const cvrA = a.clicksCount ? a.conversionsCount / a.clicksCount : 0;
        const cvrB = b.clicksCount ? b.conversionsCount / b.clicksCount : 0;

        if (goal === 'clicks') return ctrB - ctrA;
        if (goal === 'conversions') return cvrB - cvrA;

        return (b.impressionsCount || 0) - (a.impressionsCount || 0);
      });
  }, [ads, shouldShowAd, adSets]);

  const trackImpression = useCallback(async (adId: string, location: string) => {
    if (!user || !business) return;

    try {
      const hasImpression = impressionHistory.some(
        imp => imp.adId === adId && imp.location === location && imp.sessionId === sessionId
      );
      if (hasImpression) {
        return;
      }
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
      console.error('Failed to track impression:', formatSupabaseError(error));
    }
  }, [user, business, impressionHistory, sessionId]);

  const trackClick = useCallback(async (adId: string, location: string) => {
    if (!user || !business) return;

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
      } else if (!recentImpression) {
        const { data, error } = await supabase
          .from('ad_impressions')
          .insert({
            ad_id: adId,
            user_id: user.id,
            business_id: business.id,
            location,
            session_id: sessionId,
            viewed_at: new Date().toISOString(),
            clicked: true,
            clicked_at: new Date().toISOString(),
            converted: false,
          })
          .select()
          .single();

        if (error) throw error;

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
            clickedAt: data.clicked_at,
            converted: data.converted,
          }]);
        }
      }
      setLastAdClick({ adId, location, at: Date.now() });
    } catch (error) {
      console.error('Failed to track click:', formatSupabaseError(error));
    }
  }, [user, business, impressionHistory, sessionId]);

  const trackConversion = useCallback(async (adId: string, location: string, value?: number) => {
    if (!user || !business) return;

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
      } else if (!recentImpression) {
        const { data, error } = await supabase
          .from('ad_impressions')
          .insert({
            ad_id: adId,
            user_id: user.id,
            business_id: business.id,
            location,
            session_id: sessionId,
            viewed_at: new Date().toISOString(),
            clicked: true,
            clicked_at: new Date().toISOString(),
            converted: true,
            converted_at: new Date().toISOString(),
            conversion_value: value,
          })
          .select()
          .single();

        if (error) throw error;

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
            clickedAt: data.clicked_at,
            converted: data.converted,
            convertedAt: data.converted_at,
            conversionValue: data.conversion_value ? parseFloat(data.conversion_value) : undefined,
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to track conversion:', formatSupabaseError(error));
    }
  }, [user, business, impressionHistory, sessionId]);

  const consumeLastAdClick = useCallback((maxAgeMinutes?: number) => {
    const getClickWindowMinutes = (adId: string) => {
      const ad = ads.find(item => item.id === adId);
      if (ad?.adSetId && adSets[ad.adSetId]) {
        const adSet = adSets[ad.adSetId];
        const days = adSet.attributionClickDays ?? 7;
        return days * 24 * 60;
      }
      return 7 * 24 * 60;
    };

    const getViewWindowMinutes = (adId: string) => {
      const ad = ads.find(item => item.id === adId);
      if (ad?.adSetId && adSets[ad.adSetId]) {
        const adSet = adSets[ad.adSetId];
        const days = adSet.attributionViewDays ?? 1;
        return days * 24 * 60;
      }
      return 24 * 60;
    };

    if (lastAdClick) {
      const clickWindow = maxAgeMinutes ?? getClickWindowMinutes(lastAdClick.adId);
      const maxAgeMs = clickWindow * 60 * 1000;
      if (Date.now() - lastAdClick.at > maxAgeMs) {
        setLastAdClick(null);
      } else {
        const payload = { adId: lastAdClick.adId, location: lastAdClick.location };
        setLastAdClick(null);
        return payload;
      }
    }

    // Fallback to last view attribution window if no valid click attribution
    if (impressionHistory.length > 0 && user?.id) {
      const latestImpression = impressionHistory
        .filter(imp => imp.userId === user.id)
        .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())[0];

      if (latestImpression) {
        const viewWindow = getViewWindowMinutes(latestImpression.adId);
        const maxAgeMs = viewWindow * 60 * 1000;
        if (Date.now() - new Date(latestImpression.viewedAt).getTime() <= maxAgeMs) {
          return { adId: latestImpression.adId, location: latestImpression.location };
        }
      }
    }

    return null;
  }, [lastAdClick, ads, adSets, impressionHistory, user?.id]);

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
        consumeLastAdClick,
        refreshAds,
        adSetsById: adSets,
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

