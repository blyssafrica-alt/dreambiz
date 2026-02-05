import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAds } from '@/contexts/AdContext';
import type { Advertisement } from '@/types/super-admin';
import { ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';

interface AdCardProps {
  ad: Advertisement;
  location: string;
  onPress?: () => void;
}

export function AdCard({ ad, location, onPress }: AdCardProps) {
  const { theme } = useTheme();
  const { trackImpression, trackClick } = useAds();

  useEffect(() => {
    // Track impression when component mounts
    trackImpression(ad.id, location);
  }, [ad.id, location, trackImpression]);

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

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.background.card }]}
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
          style={styles.image}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.content}>
        {ad.headline && (
          <Text style={[styles.headline, { color: theme.text.primary }]}>
            {ad.headline}
          </Text>
        )}
        
        {ad.bodyText && (
          <Text style={[styles.bodyText, { color: theme.text.secondary }]}>
            {ad.bodyText}
          </Text>
        )}
        
        <View style={styles.ctaContainer}>
          <View style={[styles.ctaButton, { backgroundColor: theme.accent.primary }]}>
            <Text style={styles.ctaText}>{ad.ctaText}</Text>
            <ExternalLink size={16} color="#FFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
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

