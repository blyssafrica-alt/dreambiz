import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAds } from '@/contexts/AdContext';
import type { Advertisement, AdTargeting } from '@/types/super-admin';
import { ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';

interface AdCardProps {
  ad: Advertisement;
  location: string;
  onPress?: () => void;
  preview?: boolean;
}

export function AdCard({ ad, location, onPress, preview = false }: AdCardProps) {
  const { theme } = useTheme();
  const { trackImpression, trackClick, adSetsById } = useAds();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const previewLineCount = ad.type === 'banner' ? 2 : ad.type === 'inline' ? 1 : 3;
  const hasBodyText = Boolean(ad.bodyText?.trim());
  const showToggle = hasBodyText && (ad.bodyText || '').length > 120;
  const ctaLabel = ad.ctaText || (ad.ctaAction === 'external_url' ? 'Learn More' : 'View');
  const adSet = ad.adSetId ? adSetsById[ad.adSetId] : undefined;
  const optimizationGoal = adSet?.optimizationGoal || 'impressions';
  const learningThreshold = adSet?.learningEventThreshold ?? 50;
  const learningEventsRaw = optimizationGoal === 'conversions' ? ad.conversionsCount : ad.clicksCount;
  const learningEvents = typeof learningEventsRaw === 'number' ? learningEventsRaw : 0;
  const isLearning = optimizationGoal !== 'impressions' && learningEvents < learningThreshold;
  const learningProgress = learningThreshold > 0 ? Math.min(learningEvents / learningThreshold, 1) : 1;
  const hasPacing = adSet?.pacingEnabled && adSet?.dailyBudget !== undefined && adSet?.dailyBudget !== null;
  const pacingProgress = hasPacing && adSet?.dailyBudget
    ? Math.min((adSet.spendActualToday || 0) / adSet.dailyBudget, 1)
    : 0;
  const targetingChips = useMemo(() => {
    const chips: string[] = [];
    const targeting = (ad.targeting || {}) as AdTargeting;
    if (targeting.targetGenders && targeting.targetGenders.length > 0) {
      const label = targeting.targetGenders.map(item => item.replace(/_/g, ' ')).join(', ');
      chips.push(`Gender: ${label}`);
    }
    if (targeting.targetAgeMin !== undefined || targeting.targetAgeMax !== undefined) {
      const min = targeting.targetAgeMin;
      const max = targeting.targetAgeMax;
      if (min !== undefined && max !== undefined) {
        chips.push(`Age: ${min}-${max}`);
      } else if (min !== undefined) {
        chips.push(`Age: ${min}+`);
      } else if (max !== undefined) {
        chips.push(`Age: <=${max}`);
      }
    }
    if (targeting.targetInterests && targeting.targetInterests.length > 0) {
      const interests = targeting.targetInterests.slice(0, 3).join(', ');
      const suffix = targeting.targetInterests.length > 3
        ? ` +${targeting.targetInterests.length - 3}`
        : '';
      chips.push(`Interests: ${interests}${suffix}`);
    }
    const hasDemographicTargets = chips.length > 0;
    if (hasDemographicTargets && targeting.requireAdConsent !== false) {
      chips.push('Consent required');
    }
    return chips;
  }, [ad.targeting]);
  const cardStyle = useMemo(() => {
    switch (ad.type) {
      case 'banner':
        return styles.bannerCard;
      case 'inline':
        return styles.inlineCard;
      case 'modal':
        return styles.modalCard;
      default:
        return styles.cardCard;
    }
  }, [ad.type]);

  useEffect(() => {
    if (preview || hasTrackedImpression) return;
    if (ad.type === 'modal') {
      if (!isModalVisible) return;
    }
    trackImpression(ad.id, location);
    setHasTrackedImpression(true);
  }, [ad.id, ad.type, hasTrackedImpression, isModalVisible, location, preview, trackImpression]);

  const handlePress = async () => {
    trackClick(ad.id, location);
    if (onPress) {
      onPress();
      return;
    }
    
    // Handle CTA actions
    if (ad.ctaAction === 'external_url' && ad.ctaUrl) {
      try {
        const canOpen = await Linking.canOpenURL(ad.ctaUrl);
        if (canOpen) {
          await Linking.openURL(ad.ctaUrl);
        } else {
          Alert.alert('Error', 'Cannot open this URL');
        }
      } catch (error) {
        console.error('Failed to open URL:', error);
        Alert.alert('Error', 'Failed to open link');
      }
    } else if (ad.ctaAction === 'open_product' && ad.ctaTargetId) {
      router.push(`/products/${ad.ctaTargetId}` as any);
    } else if (ad.ctaAction === 'open_book' && ad.ctaTargetId) {
      router.push(`/books/${ad.ctaTargetId}` as any);
    } else if (ad.ctaAction === 'open_feature' && ad.ctaTargetId) {
      // Navigate to feature or show feature details
      router.push(`/features/${ad.ctaTargetId}` as any);
    } else if (ad.ctaUrl) {
      // Fallback: try to open as URL
      try {
        const canOpen = await Linking.canOpenURL(ad.ctaUrl);
        if (canOpen) {
          await Linking.openURL(ad.ctaUrl);
        }
      } catch (error) {
        console.error('Failed to open URL:', error);
      }
    }
  };

  useEffect(() => {
    if (ad.type !== 'modal' || preview) return;
    const delaySeconds = ad.placement?.delaySeconds ?? 0;
    if (delaySeconds <= 0) {
      setIsModalVisible(true);
      return;
    }
    const timer = setTimeout(() => setIsModalVisible(true), delaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [ad.placement?.delaySeconds, ad.type, preview]);

  const content = (
    <TouchableOpacity
      style={[styles.container, cardStyle, { backgroundColor: theme.background.card }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.sponsoredLabel, { color: theme.text.tertiary }]}>Sponsored</Text>
          <Text style={[styles.brandText, { color: theme.text.primary }]}>
            {ad.title}
          </Text>
        </View>
        <View style={styles.badgeRow}>
          {adSet && (
            <View style={[styles.goalPill, { backgroundColor: theme.background.secondary }]}>
              <Text style={[styles.goalText, { color: theme.text.secondary }]}>{optimizationGoal.toUpperCase()}</Text>
            </View>
          )}
          {isLearning && (
            <View style={[styles.learningPill, { backgroundColor: theme.background.secondary }]}>
              <Text style={[styles.learningText, { color: theme.text.secondary }]}>Learning</Text>
            </View>
          )}
        </View>
      </View>
      {targetingChips.length > 0 && (
        <View style={styles.targetingRow}>
          {targetingChips.map((chip) => (
            <View key={chip} style={[styles.targetingChip, { backgroundColor: theme.background.secondary }]}>
              <Text style={[styles.targetingChipText, { color: theme.text.secondary }]}>{chip}</Text>
            </View>
          ))}
        </View>
      )}

      {ad.imageUrl && (
        <Image
          source={{ uri: ad.imageUrl }}
          style={[styles.image, ad.type === 'banner' ? styles.bannerImage : ad.type === 'inline' ? styles.inlineImage : styles.cardImage]}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.content}>
        {ad.headline && (
          <Text style={[styles.headline, { color: theme.text.primary }]}>
            {ad.headline}
          </Text>
        )}

        {isLearning && (
          <View style={styles.learningContainer}>
            <View style={[styles.learningTrack, { backgroundColor: theme.border.light }]}>
              <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${learningProgress * 100}%` }]} />
            </View>
            <Text style={[styles.learningProgressText, { color: theme.text.tertiary }]}>
              {learningEvents}/{learningThreshold} events
            </Text>
          </View>
        )}

        {hasPacing && (
          <View style={styles.learningContainer}>
            <View style={[styles.learningTrack, { backgroundColor: theme.border.light }]}>
              <View style={[styles.learningFill, { backgroundColor: theme.accent.primary, width: `${pacingProgress * 100}%` }]} />
            </View>
            <Text style={[styles.learningProgressText, { color: theme.text.tertiary }]}>
              Today: {adSet?.currency || 'USD'} {adSet?.spendActualToday?.toFixed(2) ?? '0.00'} / {adSet?.dailyBudget?.toFixed(2) ?? '—'}
            </Text>
          </View>
        )}
        
        {hasBodyText && (
          <>
            <Text
              style={[styles.bodyText, { color: theme.text.secondary }]}
              numberOfLines={isExpanded ? undefined : previewLineCount}
            >
              {ad.bodyText}
            </Text>
            {showToggle && (
              <TouchableOpacity onPress={() => setIsExpanded(prev => !prev)} style={styles.toggleButton}>
                <Text style={[styles.toggleText, { color: theme.accent.primary }]}>
                  {isExpanded ? 'View less' : 'View more'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
        
        <View style={styles.ctaContainer}>
          <View style={[styles.ctaButton, { backgroundColor: theme.accent.primary }]}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
            <ExternalLink size={16} color="#FFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (ad.type !== 'modal' || preview) {
    return content;
  }

  if (!isModalVisible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Sponsored</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseButton}>
              <Text style={[styles.modalCloseText, { color: theme.text.secondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
          {content}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardCard: {},
  bannerCard: {},
  modalCard: {},
  inlineCard: {
    marginVertical: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  goalText: {
    fontSize: 10,
    fontWeight: '700',
  },
  learningPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  learningText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sponsoredLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    height: 200,
  },
  cardImage: {
    height: 200,
  },
  bannerImage: {
    height: 140,
  },
  inlineImage: {
    height: 120,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  learningContainer: {
    gap: 6,
  },
  learningTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  learningFill: {
    height: 6,
    borderRadius: 999,
  },
  learningProgressText: {
    fontSize: 11,
  },
  targetingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  targetingChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  targetingChipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  toggleButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ctaContainer: {
    width: '100%',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

