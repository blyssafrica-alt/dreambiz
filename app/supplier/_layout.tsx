import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { supabase } from '@/lib/supabase';
import { spacing, radius, typography, minTouchTarget } from '@/constants/layout';

export default function SupplierDashboardLayout() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const [hasApprovedProfile, setHasApprovedProfile] = useState<boolean | null>(null);

  const canAccess = isFeatureVisible('supplier-sell');

  useEffect(() => {
    if (!user?.id || !canAccess) {
      setHasApprovedProfile(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from('supplier_marketplace_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();
      setHasApprovedProfile(!!data);
    };
    check();
  }, [user?.id, canAccess]);

  if (!canAccess) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Not available</Text>
        <Text style={[styles.message, { color: theme.text.secondary }]}>
          Supplier dashboard is not available for your account.
        </Text>
      </View>
    );
  }

  if (hasApprovedProfile === null) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingLabel, { color: theme.text.tertiary }]}>Checking access...</Text>
      </View>
    );
  }

  if (!hasApprovedProfile) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background.secondary }]}>
        <Text style={[styles.title, { color: theme.text.primary }]}>Supplier dashboard</Text>
        <Text style={[styles.message, { color: theme.text.secondary }]}>
          You need an approved supplier profile to access the dashboard.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent.primary }]}
          onPress={() => router.replace('/suppliers-marketplace/become-a-supplier' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Apply to become a supplier</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="store" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="products/index" />
      <Stack.Screen name="products/new" />
      <Stack.Screen name="products/import" />
      <Stack.Screen name="products/[id]" />
      <Stack.Screen name="ads" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="subcategories" />
      <Stack.Screen name="inbox" />
      <Stack.Screen name="inbox/[conversationId]" />
      <Stack.Screen name="rfqs" />
      <Stack.Screen name="rfqs/[rfqId]" />
      <Stack.Screen name="complaints" />
      <Stack.Screen name="complaints/[id]" />
      <Stack.Screen name="updates" />
      <Stack.Screen name="purchase-orders" />
      <Stack.Screen name="promote" />
      <Stack.Screen name="promote-pay/[id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  title: { ...typography.sectionTitle, marginBottom: spacing.xs, textAlign: 'center' },
  message: { ...typography.bodySmall, textAlign: 'center', marginBottom: spacing.md },
  loadingLabel: { marginTop: spacing.sm, ...typography.caption },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minHeight: minTouchTarget,
    justifyContent: 'center',
  },
  buttonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
