import { Tabs } from "expo-router";
import { Home, DollarSign, FileText, Calculator, Settings, Package, Users, Truck, BarChart3, Target, TrendingUp, FolderKanban, UserCircle, Percent, Receipt, Repeat, ShoppingCart, Calendar, Link as LinkIcon, Sparkles, Building2 } from "lucide-react-native";
import React from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { getVisibleTabs } from "@/constants/books";

export default function TabLayout() {
  const { theme, isLoading } = useTheme();
  const { business } = useBusiness();
  
  const visibleTabs = getVisibleTabs(business?.dreamBigBook);
  
  // Show loading indicator while theme is loading
  if (isLoading || !theme) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent.primary,
        tabBarInactiveTintColor: theme.text.tertiary,
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          borderTopWidth: 0,
          backgroundColor: theme.background.card,
          shadowColor: theme.shadow.color,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: theme.shadow.opacity,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Home 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          title: "Finances",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <DollarSign 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          href: visibleTabs.includes('products') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Package 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Customers",
          href: visibleTabs.includes('customers') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Users 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: "Suppliers",
          href: visibleTabs.includes('suppliers') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Truck 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <FileText 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          href: visibleTabs.includes('reports') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <BarChart3 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: "Budgets",
          href: visibleTabs.includes('budgets') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Target 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cashflow"
        options={{
          title: "Cashflow",
          href: visibleTabs.includes('cashflow') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <TrendingUp 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: "Calculator",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Calculator 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          href: visibleTabs.includes('projects') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <FolderKanban 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: "Employees",
          href: visibleTabs.includes('employees') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <UserCircle 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tax"
        options={{
          title: "Tax",
          href: visibleTabs.includes('tax') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Percent 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          href: visibleTabs.includes('accounts') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Receipt 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recurring-invoices"
        options={{
          title: "Recurring",
          href: visibleTabs.includes('recurring-invoices') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Repeat 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: "POS",
          href: business?.type === 'retail' ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <ShoppingCart 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          href: business?.type === 'services' || business?.type === 'salon' ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Calendar 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="integrations"
        options={{
          title: "Integrations",
          href: visibleTabs.includes('integrations') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <LinkIcon 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          href: visibleTabs.includes('insights') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Sparkles 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="businesses"
        options={{
          title: "Businesses",
          href: visibleTabs.includes('businesses') ? undefined : null,
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Building2 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="provider-settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Settings 
              size={focused ? 26 : 24} 
              color={color} 
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
