import { Tabs } from "expo-router";
import { 
  LayoutDashboard, 
  TrendingUp, 
  FileCheck, 
  CreditCard, 
  Grid3x3 
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Platform, View, ActivityIndicator, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
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
  gradientColors?: string[];
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
  }, [focused]);

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
  const insets = useSafeAreaInsets();
  
  // Show loading indicator while theme is loading
  if (isLoading || !theme) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Calculate tab bar bottom padding to ensure it's above phone navigation
  // Increased padding for better clickability and to avoid phone navigation
  const tabBarBottomPadding = Platform.OS === 'ios' 
    ? Math.max(32, insets.bottom + 8) // iOS: extra padding above safe area
    : Math.max(24, insets.bottom + 12); // Android: more padding to avoid gesture navigation

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent.primary,
        tabBarInactiveTintColor: theme.text.tertiary,
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 95 : 80,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 12,
          borderTopWidth: 0,
          backgroundColor: theme.background.card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 12,
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
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
      <Tabs.Screen
        name="finances"
        options={{
          title: "Finances",
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
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
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
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              Icon={CreditCard}
              color={color}
              focused={focused}
              gradientColors={['#F59E0B', '#D97706']}
            />
          ),
        }}
      />
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
      <Tabs.Screen name="pos" options={{ href: null }} />
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
