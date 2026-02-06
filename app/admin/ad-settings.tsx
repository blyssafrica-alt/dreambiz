import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, Settings as SettingsIcon, Megaphone, Boxes, Layers, BarChart3 } from 'lucide-react-native';

type AdSettingsItem = {
  title: string;
  description: string;
  route: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

export default function AdSettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const items: AdSettingsItem[] = [
    {
      title: 'Ads',
      description: 'Create and approve ads',
      route: '/admin/ads',
      icon: Megaphone,
    },
    {
      title: 'Ad Packages',
      description: 'Manage pricing tiers and durations',
      route: '/admin/ad-packages',
      icon: Boxes,
    },
    {
      title: 'Ad Campaigns',
      description: 'Campaign goals and budgets',
      route: '/admin/ad-campaigns',
      icon: Layers,
    },
    {
      title: 'Ad Sets',
      description: 'Delivery rules, pacing, and rates',
      route: '/admin/ad-sets',
      icon: Layers,
    },
    {
      title: 'Ad Analytics',
      description: 'Spend, performance, and demographics',
      route: '/admin/ad-analytics',
      icon: BarChart3,
    },
    {
      title: 'Billing Defaults',
      description: 'Default billing model and rate',
      route: '/admin/settings',
      icon: SettingsIcon,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.background.card }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text.primary }]}>Ad Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.title}
              style={[styles.card, { backgroundColor: theme.background.card, borderColor: theme.border.light }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${theme.accent.primary}15` }]}>
                  <Icon size={18} color={theme.accent.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: theme.text.primary }]}>{item.title}</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.text.secondary }]}>{item.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
});

