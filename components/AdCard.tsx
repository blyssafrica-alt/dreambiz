import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAds } from '@/contexts/AdContext';
import type { Advertisement } from '@/types/super-admin';
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
  const { trackImpression, trackClick } = useAds();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const previewLineCount = ad.type === 'banner' ? 2 : ad.type === 'inline' ? 1 : 3;
  const hasBodyText = Boolean(ad.bodyText?.trim());
  const showToggle = hasBodyText && (ad.bodyText || '').length > 120;
  const ctaLabel = ad.ctaText || (ad.ctaAction === 'external_url' ? 'Learn More' : 'View');
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
      </View>

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

