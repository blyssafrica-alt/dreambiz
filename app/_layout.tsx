// Import gesture handler FIRST - this is critical for touch events
import 'react-native-gesture-handler';

// Initialize monitoring services BEFORE any other imports
import { initMonitoring } from '@/lib/monitoring';

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
import { SettingsContext } from "@/contexts/SettingsContext";
import { StatusBar } from 'react-native';
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';

SplashScreen.preventAutoHideAsync();

// Initialize monitoring (Sentry, PostHog)
initMonitoring();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hasOnboarded, isLoading: businessLoading } = useBusiness();
  const { isAuthenticated, isLoading: authLoading, authUser } = useAuth();
  const { theme, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = React.useState<boolean | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = React.useState(true);

  const isLoading = businessLoading || authLoading;

  // Hide loading screen after initial load
  React.useEffect(() => {
    if (!isLoading && !authLoading && !businessLoading) {
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 800); // Small delay for smooth transition
      return () => clearTimeout(timer);
    }
  }, [isLoading, authLoading, businessLoading]);

  // Check email verification status (only when authenticated)
  React.useEffect(() => {
    const checkEmailVerification = async () => {
      // Only check if user is authenticated
      if (!isAuthenticated || !authUser) {
        setEmailVerified(null);
        return;
      }

      try {
        // CRITICAL: Refresh the session first to get the latest email verification status
        // This is especially important when user clicks email verification link and comes back
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log('Session refresh error (non-critical):', refreshError.message);
        }
        
        // Use static import from top of file - get the refreshed session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setEmailVerified(null);
          return;
        }
        
        // Only set if we have a valid session
        if (session?.user) {
          const isVerified = !!session.user.email_confirmed_at;
          setEmailVerified(isVerified);
          console.log('Email verification status:', isVerified ? 'Verified' : 'Not verified');
        } else {
          // No session means not authenticated
          setEmailVerified(null);
        }
      } catch (error: any) {
        console.error('Error checking email verification:', error?.message || error);
        // On error, assume not verified to be safe
        setEmailVerified(false);
      }
    };

    // Only check if authenticated
    if (isAuthenticated && authUser) {
      checkEmailVerification();
    } else {
      setEmailVerified(null);
    }
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    if (isLoading) return; // Wait for auth to load

    const currentPath = segments.join('/');
    const inAuth = currentPath.includes('landing') || currentPath.includes('sign-up') || currentPath.includes('sign-in');
    const inVerifyEmail = currentPath.includes('verify-email');
    const inOnboarding = currentPath.includes('onboarding');
    const inTabs = currentPath.includes('(tabs)') || currentPath === '';

    // If not authenticated, redirect to landing page (don't check email verification)
    if (!isAuthenticated) {
      if (!inAuth && !inVerifyEmail) {
        router.replace('/landing' as any);
      }
      return;
    }

    // CRITICAL: If authenticated, we MUST check email verification status
    // If email verification check is still pending, wait a bit but then proceed with assumption
    if (emailVerified === null && isAuthenticated) {
      // Wait a maximum of 2 seconds for email verification check
      // After that, assume not verified to be safe
      const timeout = setTimeout(() => {
        if (emailVerified === null) {
          console.log('Email verification check timed out, assuming not verified');
          setEmailVerified(false);
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }

    // CRITICAL: If authenticated but email not verified, redirect to verification screen
    // This must happen BEFORE checking onboarding status
    // Also redirect if we're on onboarding but email is not verified
    if (isAuthenticated && emailVerified === false) {
      if (!inVerifyEmail && !inAuth) {
        console.log('Redirecting to verify-email: email not verified');
        router.replace('/verify-email' as any);
      }
      return;
    }

    // If authenticated, email verified, but not onboarded, redirect to onboarding
    // Only proceed to onboarding if email is verified (emailVerified === true)
    if (isAuthenticated && emailVerified === true && !hasOnboarded) {
      if (!inOnboarding && !inVerifyEmail) {
        console.log('Redirecting to onboarding: email verified, not onboarded');
        router.replace('/onboarding' as any);
      }
      return;
    }

    // If authenticated and onboarded, redirect to main app (tabs)
    if (isAuthenticated && hasOnboarded && (inAuth || inOnboarding || inVerifyEmail)) {
      router.replace('/(tabs)' as any);
      return;
    }
  }, [isAuthenticated, hasOnboarded, emailVerified, isLoading, segments, router]);

  // Show loading screen during initial app load
  if (showLoadingScreen || isLoading) {
    return <LoadingScreen message="Loading DreamBiz..." />;
  }

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
        <Stack.Screen name="document/[id]" options={{ title: 'Document', headerShown: true }} />
        <Stack.Screen name="business-plan" options={{ title: 'Business Plan', headerShown: true }} />
        <Stack.Screen name="help" options={{ title: 'Help & Support', headerShown: false }} />
        <Stack.Screen name="books" options={{ headerShown: false }} />
        <Stack.Screen name="my-library" options={{ title: 'My Library', headerShown: false }} />
        <Stack.Screen name="receipt-scan" options={{ title: 'Scan Receipt', headerShown: false }} />
        <Stack.Screen name="payments" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Hide native splash screen - our custom loading screen will handle the transition
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore errors
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeContext>
          <ProviderContext>
            <AuthContext>
              <SettingsContext>
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
              </SettingsContext>
            </AuthContext>
          </ProviderContext>
        </ThemeContext>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
