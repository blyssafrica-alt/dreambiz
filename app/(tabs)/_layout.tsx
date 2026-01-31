import { Tabs } from "expo-router";
import { 
  LayoutDashboard, 
  TrendingUp, 
  FileCheck, 
  CreditCard, 
  Grid3x3,
  ScanLine
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Platform, View, ActivityIndicator, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useFeatures } from "@/contexts/FeatureContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { LinearGradient } from "expo-linear-gradient";

// Animated Tab Icon Component
function AnimatedTabIcon({ 
  Icon, 
  color, 
  focused, 
  gradientColors 
}: { 
  Icon: any; 
  color: string; 
  focused: boolean; 
  gradientColors?: readonly [string, string, ...string[]];
}) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.15 : 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.65,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, opacityAnim, scaleAnim]);

  if (focused && gradientColors) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon 
              size={22} 
              color="#FFFFFF" 
              strokeWidth={2.5}
            />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon 
        size={focused ? 24 : 22} 
        color={color} 
        strokeWidth={focused ? 2.5 : 2}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const { theme, isLoading } = useTheme();
  const { shouldShowAsTab, isFeatureVisible, isLoading: featuresLoading } = useFeatures();
  const { business } = useBusiness();
  const insets = useSafeAreaInsets();
  
  // POS visibility is feature-driven (global + book selection)
  const showPOSTab = shouldShowAsTab('pos');
  
  // Show loading indicator while theme or features are loading
  if (isLoading || featuresLoading || !theme) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Calculate tab bar bottom padding to ensure it's above phone navigation
  // Significantly increased padding for Android to avoid gesture navigation overlap
  const tabBarBottomPadding = Platform.OS === 'ios' 
    ? Math.max(34, insets.bottom + 10) // iOS: extra padding above safe area
    : Math.max(40, insets.bottom + 20); // Android: much more padding to avoid gesture navigation (minimum 40px)

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent.primary,
        tabBarInactiveTintColor: theme.text.tertiary,
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 100 : 90, // Increased height for better spacing
          paddingBottom: tabBarBottomPadding,
          paddingTop: 12,
          borderTopWidth: 0,
          backgroundColor: theme.background.card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.02,
          shadowRadius: 4,
          elevation: 2,
          position: 'absolute', // Ensure tab bar stays at bottom
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      {/* Dashboard tab - always visible (core feature) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          href: undefined,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              Icon={LayoutDashboard}
              color={color}
              focused={focused}
              gradientColors={['#6366F1', '#8B5CF6']}
            />
          ),
        }}
      />
      
      {/* Finances tab - always visible (core feature) */}
      <Tabs.Screen
        name="finances"
        options={{
          title: "Finances",
          href: undefined,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              Icon={TrendingUp}
              color={color}
              focused={focused}
              gradientColors={['#10B981', '#059669']}
            />
          ),
        }}
      />
      
      {/* Documents tab - always visible (core feature) */}
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
          href: undefined,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              Icon={FileCheck}
              color={color}
              focused={focused}
              gradientColors={['#3B82F6', '#2563EB']}
            />
          ),
        }}
      />
      
      {/* POS tab - visible only for retail businesses (primary feature) */}
      <Tabs.Screen
        name="pos"
        options={{
          title: "POS",
          href: showPOSTab ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              Icon={ScanLine}
              color={color}
              focused={focused}
              gradientColors={['#F59E0B', '#D97706']}
            />
          ),
        }}
      />
      
      {/* Payments tab - always visible (no feature config, but allow if needed) */}
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              Icon={CreditCard}
              color={color}
              focused={focused}
              gradientColors={showPOSTab ? ['#8B5CF6', '#7C3AED'] : ['#F59E0B', '#D97706']}
            />
          ),
        }}
      />
      
      {/* More tab - always visible (navigation hub) */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              Icon={Grid3x3}
              color={color}
              focused={focused}
              gradientColors={['#EC4899', '#DB2777']}
            />
          ),
        }}
      />
      {/* Hide all other tabs - they're accessible via More menu */}
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="customers" options={{ href: null }} />
      <Tabs.Screen name="suppliers" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="budgets" options={{ href: null }} />
      <Tabs.Screen name="cashflow" options={{ href: null }} />
      <Tabs.Screen name="calculator" options={{ href: null }} />
      <Tabs.Screen name="projects" options={{ href: null }} />
      <Tabs.Screen name="employees" options={{ href: null }} />
      <Tabs.Screen name="tax" options={{ href: null }} />
      <Tabs.Screen name="accounts" options={{ href: null }} />
      <Tabs.Screen name="recurring-invoices" options={{ href: null }} />
      <Tabs.Screen name="pos-day-end" options={{ href: null }} />
      <Tabs.Screen name="appointments" options={{ href: null }} />
      <Tabs.Screen name="integrations" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="businesses" options={{ href: null }} />
      <Tabs.Screen name="provider-settings" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="store" options={{ href: null }} />
      <Tabs.Screen name="store/[id]" options={{ href: null }} />
    </Tabs>
  );
}
