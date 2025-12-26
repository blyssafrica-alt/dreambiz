// Import gesture handler FIRST - this is critical for touch events
import 'react-native-gesture-handler';

// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BusinessContext, useBusiness } from "@/contexts/BusinessContext";
import { AuthContext, useAuth } from "@/contexts/AuthContext";
import { ThemeContext, useTheme } from "@/contexts/ThemeContext";
import { ProviderContext } from "@/contexts/ProviderContext";
import { StatusBar } from 'react-native';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hasOnboarded, isLoading: businessLoading } = useBusiness();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const isLoading = businessLoading || authLoading;

  useEffect(() => {
    if (isLoading) return;

    const currentPath = segments.join('/');
    const inAuth = currentPath.includes('landing') || currentPath.includes('sign-up') || currentPath.includes('sign-in');
    const inOnboarding = currentPath.includes('onboarding');
    const inTabs = currentPath.includes('(tabs)') || currentPath === '';

    // If not authenticated, redirect to landing page
    if (!isAuthenticated && !inAuth) {
      router.replace('/landing' as any);
    } 
    // If authenticated but not onboarded, redirect to onboarding
    else if (isAuthenticated && !hasOnboarded && !inOnboarding) {
      router.replace('/onboarding' as any);
    } 
    // If authenticated and onboarded, redirect to main app (tabs)
    else if (isAuthenticated && hasOnboarded && (inAuth || inOnboarding)) {
      router.replace('/(tabs)' as any);
    }
  }, [isAuthenticated, hasOnboarded, isLoading, segments, router]);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack 
        screenOptions={{ 
          headerBackTitle: "Back",
          headerStyle: {
            backgroundColor: theme.background.card,
          },
          headerTintColor: theme.text.primary,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
        <Stack.Screen name="business-plan" options={{ title: 'Business Plan' }} />
        <Stack.Screen name="help" options={{ title: 'Help & Support' }} />
        <Stack.Screen name="receipt-scan" options={{ title: 'Scan Receipt' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeContext>
          <ProviderContext>
            <AuthContext>
              <BusinessContext>
                <RootLayoutNav />
              </BusinessContext>
            </AuthContext>
          </ProviderContext>
        </ThemeContext>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
