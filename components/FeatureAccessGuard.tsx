import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { usePremium } from '@/contexts/PremiumContext';
import PremiumUpgradeModal from './PremiumUpgradeModal';
import { Crown, Lock } from 'lucide-react-native';

interface FeatureAccessGuardProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeModal?: boolean; // If true, shows upgrade modal instead of fallback
  onAccessDenied?: () => void;
}

/**
 * FeatureAccessGuard - Wraps content that requires specific feature access
 * Shows upgrade modal if user doesn't have access
 */
export default function FeatureAccessGuard({
  featureId,
  children,
  fallback,
  showUpgradeModal = true,
  onAccessDenied,
}: FeatureAccessGuardProps) {
  const { theme } = useTheme();
  const { isFeatureVisible, features, isLoading } = useFeatures();
  const { currentPlan, hasActivePremium } = usePremium();
  const [showModal, setShowModal] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  const feature = features.find(f => f.featureId === featureId);

  useEffect(() => {
    if (isLoading) {
      setChecking(true);
      return;
    }

    const visible = isFeatureVisible(featureId);
    setHasAccess(visible);
    setChecking(false);
  }, [isFeatureVisible, featureId, isLoading]);

  // Separate effect to handle modal display
  useEffect(() => {
    if (!checking && !isLoading && !hasAccess && showUpgradeModal) {
      setShowModal(true);
      onAccessDenied?.();
    }
  }, [hasAccess, checking, isLoading, showUpgradeModal, onAccessDenied]);

  // Get required plans for this feature
  const requiredPlans = feature?.premiumPlanIds || [];
  const requiredPlanNames = requiredPlans.length > 0 
    ? requiredPlans.map(planId => {
        // This would need to be loaded from subscription_plans
        // For now, we'll show generic message
        return planId;
      })
    : [];

  // If still checking, show nothing or loading state
  if (checking || isLoading) {
    return null; // Or return a loading spinner
  }

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If showing upgrade modal
  if (showUpgradeModal) {
    return (
      <>
        {fallback || (
          <View style={[styles.lockedContainer, { backgroundColor: theme.background.secondary }]}>
            <Lock size={48} color={theme.text.tertiary} />
            <Text style={[styles.lockedTitle, { color: theme.text.primary }]}>
              Premium Feature
            </Text>
            <Text style={[styles.lockedMessage, { color: theme.text.secondary }]}>
              This feature requires a premium subscription
            </Text>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: theme.accent.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Crown size={18} color="#FFF" />
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        )}
        <PremiumUpgradeModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          title="Upgrade to unlock"
          message={
            requiredPlans.length > 0
              ? `This feature is available in specific subscription plans. Choose a plan below to unlock it.`
              : `Unlock ${feature?.name || 'this feature'} and more with a premium plan.`
          }
          feature={feature?.name || featureId}
          featureId={featureId}
        />
      </>
    );
  }

  // Otherwise, show fallback
  return <>{fallback || null}</>;
}

/**
 * Hook to check feature access and get upgrade info
 */
export function useFeatureAccess(featureId: string) {
  const { isFeatureVisible, features, isLoading } = useFeatures();
  const { currentPlan, hasActivePremium } = usePremium();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const feature = features.find(f => f.featureId === featureId);
  const hasAccess = !isLoading && isFeatureVisible(featureId);
  const requiredPlans = feature?.premiumPlanIds || [];

  return {
    hasAccess,
    isLoading,
    feature,
    currentPlan,
    hasActivePremium,
    requiredPlans,
    showUpgradeModal,
    setShowUpgradeModal,
    checkAccess: () => {
      if (!hasAccess) {
        setShowUpgradeModal(true);
      }
      return hasAccess;
    },
  };
}

const styles = StyleSheet.create({
  lockedContainer: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  lockedMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

