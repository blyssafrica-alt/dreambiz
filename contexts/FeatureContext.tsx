import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { FeatureConfig, FeatureVisibilityType } from '@/types/super-admin';
import type { DreamBigBook, BusinessType, BusinessStage } from '@/types/business';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';
import { usePremium } from './PremiumContext';

interface FeatureContextValue {
  features: FeatureConfig[];
  enabledFeatureIds: string[];
  isLoading: boolean;
  isFeatureVisible: (featureId: string) => boolean;
  shouldShowAsTab: (featureId: string) => boolean;
  getVisibleTabs: () => string[];
  refreshFeatures: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextValue | undefined>(undefined);

export function FeatureContextProvider({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  const { business } = useBusiness();
  const { hasActivePremium, checkFeatureAccess } = usePremium();
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [enabledFeatureIds, setEnabledFeatureIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFeatures = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Super admins can see all features (even disabled ones for management)
      const query = supabase
        .from('feature_config')
        .select('*')
        .order('category', { ascending: true });

      if (!isSuperAdmin) {
        query.eq('enabled', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const featureConfigs: FeatureConfig[] = data.map((row: any) => ({
          id: row.id,
          featureId: row.feature_id,
          name: row.name,
          description: row.description,
          category: row.category,
          visibility: row.visibility || {},
          access: row.access || {},
          enabled: row.enabled,
          enabledByDefault: row.enabled_by_default,
          canBeDisabled: row.can_be_disabled,
          isPremium: row.is_premium || false,
          premiumPlanIds: row.premium_plan_ids || [],
          updatedBy: row.updated_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        setFeatures(featureConfigs);
        
        // Extract enabled feature IDs
        const enabled = featureConfigs
          .filter(f => f.enabled)
          .map(f => f.featureId);
        setEnabledFeatureIds(enabled);
      }
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const isFeatureVisible = useCallback((featureId: string): boolean => {
    // Super admins can always see everything
    if (isSuperAdmin) return true;

    const feature = features.find(f => f.featureId === featureId);
    if (!feature || !feature.enabled) return false;

    // Check premium requirement
    if (feature.isPremium) {
      if (!hasActivePremium) {
        return false; // Feature requires premium
      }
      
      // Check if user's plan includes this feature
      if (feature.premiumPlanIds && feature.premiumPlanIds.length > 0) {
        if (!checkFeatureAccess(featureId)) {
          return false; // User's plan doesn't include this feature
        }
      }
    }

    const userBook = business?.dreamBigBook;
    const businessType = business?.type;
    const businessStage = business?.stage;

    // Check book requirement
    if (feature.access.requiresBook && feature.access.requiresBook.length > 0) {
      if (!userBook || !feature.access.requiresBook.includes(userBook)) {
        return false;
      }
    }

    // Check business type requirement
    if (feature.access.requiresBusinessType && businessType) {
      if (!feature.access.requiresBusinessType.includes(businessType)) {
        return false;
      }
    }

    // Check feature dependencies
    if (feature.access.requiresFeature && feature.access.requiresFeature.length > 0) {
      const hasAllDeps = feature.access.requiresFeature.every(
        dep => enabledFeatureIds.includes(dep)
      );
      if (!hasAllDeps) return false;
    }

    // Check business stage
    if (feature.access.minBusinessStage && businessStage) {
      const stageOrder: BusinessStage[] = ['idea', 'running', 'growing'];
      const minIndex = stageOrder.indexOf(feature.access.minBusinessStage);
      const currentIndex = stageOrder.indexOf(businessStage);
      if (currentIndex < minIndex) return false;
    }

    return true;
  }, [features, enabledFeatureIds, business, isSuperAdmin, hasActivePremium, checkFeatureAccess]);

  const shouldShowAsTab = useCallback((featureId: string): boolean => {
    if (!isFeatureVisible(featureId)) return false;

    const feature = features.find(f => f.featureId === featureId);
    if (!feature) return false;

    return feature.visibility.showAsTab && feature.visibility.type === 'tab';
  }, [features, isFeatureVisible]);

  const getVisibleTabs = useCallback((): string[] => {
    return features
      .filter(f => shouldShowAsTab(f.featureId))
      .map(f => f.featureId);
  }, [features, shouldShowAsTab]);

  const refreshFeatures = useCallback(async () => {
    await loadFeatures();
  }, [loadFeatures]);

  return (
    <FeatureContext.Provider
      value={{
        features,
        enabledFeatureIds,
        isLoading,
        isFeatureVisible,
        shouldShowAsTab,
        getVisibleTabs,
        refreshFeatures,
      }}
    >
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures() {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureContextProvider');
  }
  return context;
}

