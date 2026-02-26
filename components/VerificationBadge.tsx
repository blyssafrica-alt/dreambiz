import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { SupplierVerificationTier } from '@/types/supplier-marketplace';

const VERIFICATION_TIER_LABELS: Record<NonNullable<SupplierVerificationTier>, string> = {
  basic: 'Basic',
  verified: 'Verified',
  premium: 'Premium',
  manufacturer: 'Manufacturer',
  distributor: 'Distributor',
};

const TIER_COLORS: Record<NonNullable<SupplierVerificationTier>, string> = {
  basic: '#6B7280',
  verified: '#10B981',
  premium: '#6366F1',
  manufacturer: '#F59E0B',
  distributor: '#8B5CF6',
};

type VerificationBadgeProps = {
  verificationTier?: SupplierVerificationTier | null;
  verificationLevel?: number;
  verificationBadgeText?: string | null;
  size?: 'small' | 'medium';
  showIcon?: boolean;
};

export function VerificationBadge({
  verificationTier,
  verificationLevel = 0,
  verificationBadgeText,
  size = 'medium',
  showIcon = true,
}: VerificationBadgeProps) {
  const { theme } = useTheme();

  const label =
    verificationBadgeText?.trim() ||
    (verificationTier && verificationTier !== 'basic' ? VERIFICATION_TIER_LABELS[verificationTier] : null) ||
    (verificationLevel > 0 ? `Verified` : null);

  if (!label) return null;

  const color = verificationTier && verificationTier !== 'basic' ? TIER_COLORS[verificationTier] : theme.accent.success;
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      {showIcon && <ShieldCheck size={isSmall ? 12 : 14} color={color} />}
      <Text style={[styles.text, { color, fontSize: isSmall ? 11 : 13 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
