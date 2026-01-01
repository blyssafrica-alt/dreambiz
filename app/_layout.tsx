// Import gesture handler FIRST - this is critical for touch events
import 'react-native-gesture-handler';

// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
// @ts-ignore - react-native-gesture-handler types are included in the package
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BusinessContext, useBusiness } from "@/contexts/BusinessContext";
import { AuthContext, useAuth } from "@/contexts/AuthContext";
import { ThemeContext, useTheme } from "@/contexts/ThemeContext";
import { ProviderContext } from "@/contexts/ProviderContext";
import { FeatureContextProvider } from "@/contexts/FeatureContext";
import { ProductContextProvider } from "@/contexts/ProductContext";
import { AdContextProvider } from "@/contexts/AdContext";
import { PremiumContextProvider } from "@/contexts/PremiumContext";
import { StatusBar } from 'react-native';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hasOnboarded, isLoading: businessLoading } = useBusiness();
  const { isAuthenticated, isLoading: authLoading, authUser } = useAuth();
  const { theme, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = React.useState<boolean | null>(null);

  const isLoading = businessLoading || authLoading;

  // Check email verification status
  React.useEffect(() => {
    const checkEmailVerification = async () => {
      if (!isAuthenticated || !authUser) {
        setEmailVerified(null);
        return;
      }

      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        setEmailVerified(session?.user?.email_confirmed_at ? true : false);
      } catch (error) {
        console.error('Error checking email verification:', error);
        setEmailVerified(false);
      }
    };

    checkEmailVerification();
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    if (isLoading || emailVerified === null) return; // Wait for email verification check

    const currentPath = segments.join('/');
    const inAuth = currentPath.includes('landing') || currentPath.includes('sign-up') || currentPath.includes('sign-in');
    const inVerifyEmail = currentPath.includes('verify-email');
    const inOnboarding = currentPath.includes('onboarding');
    const inTabs = currentPath.includes('(tabs)') || currentPath === '';

    // If not authenticated, redirect to landing page
    if (!isAuthenticated && !inAuth) {
      router.replace('/landing' as any);
      return;
    }

    // If authenticated but email not verified, redirect to verification screen
    if (isAuthenticated && !emailVerified && !inVerifyEmail && !inAuth) {
      router.replace('/verify-email' as any);
      return;
    }

    // If authenticated, email verified, but not onboarded, redirect to onboarding
    if (isAuthenticated && emailVerified && !hasOnboarded && !inOnboarding && !inVerifyEmail) {
      router.replace('/onboarding' as any);
      return;
    }

    // If authenticated and onboarded, redirect to main app (tabs)
    if (isAuthenticated && hasOnboarded && (inAuth || inOnboarding || inVerifyEmail)) {
      router.replace('/(tabs)' as any);
      return;
    }
  }, [isAuthenticated, hasOnboarded, emailVerified, isLoading, segments, router]);

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
        <Stack.Screen name="verify-email" options={{ headerShown: false }} />
        <Stack.Screen name="employee-login" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="document/[id]" options={{ title: 'Document' }} />
        <Stack.Screen name="business-plan" options={{ title: 'Business Plan' }} />
        <Stack.Screen name="help" options={{ title: 'Help & Support' }} />
        <Stack.Screen name="books" options={{ headerShown: false }} />
        <Stack.Screen name="books/read/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="my-library" options={{ title: 'My Library' }} />
        <Stack.Screen name="receipt-scan" options={{ title: 'Scan Receipt' }} />
        <Stack.Screen name="payments" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
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
                <PremiumContextProvider>
                  <FeatureContextProvider>
                    <ProductContextProvider>
                      <AdContextProvider>
                        <RootLayoutNav />
                      </AdContextProvider>
                    </ProductContextProvider>
                  </FeatureContextProvider>
                </PremiumContextProvider>
              </BusinessContext>
            </AuthContext>
          </ProviderContext>
        </ThemeContext>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
