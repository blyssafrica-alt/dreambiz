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

  // Hide loading screen after initial load completes - prevent flicker with debouncing
  const loadingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  React.useEffect(() => {
    // Clear any pending timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    if (!isLoading && !authLoading && !businessLoading) {
      // Small delay to prevent flicker if loading state changes rapidly
      loadingTimeoutRef.current = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 100);
    } else {
      // Show loading screen immediately when loading starts
      setShowLoadingScreen(true);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, authLoading, businessLoading]);

  // Check email verification status (only when authenticated)
  React.useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout | null = null;

    const checkEmailVerification = async () => {
      // Only check if user is authenticated
      if (!isAuthenticated || !authUser) {
        if (isMounted) {
          setEmailVerified(null);
        }
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
          if (isMounted) {
            setEmailVerified(null);
          }
          return;
        }
        
        // Only set if we have a valid session and component is still mounted
        if (isMounted && session?.user) {
          const isVerified = !!session.user.email_confirmed_at;
          const previousVerified = emailVerified;
          setEmailVerified(isVerified);
          console.log('Email verification status:', isVerified ? 'Verified' : 'Not verified');
          
          // If just became verified, trigger navigation immediately
          if (isVerified && previousVerified !== true) {
            console.log('Email verification just detected - will trigger navigation on next render');
          }
        } else if (isMounted) {
          // No session means not authenticated
          setEmailVerified(null);
        }
      } catch (error: any) {
        console.error('Error checking email verification:', error?.message || error);
        // On error, assume not verified to be safe (only if still mounted)
        if (isMounted) {
          setEmailVerified(false);
        }
      }
    };

    // Only check if authenticated
    if (isAuthenticated && authUser) {
      // Check immediately when authenticated
      checkEmailVerification();
      
      // Poll for email verification (every 3 seconds) - reduced frequency to prevent glitches
      // This helps when user clicks email link and returns to app
      checkInterval = setInterval(() => {
        if (isMounted) {
          // Only poll if email is not verified yet to reduce unnecessary checks
          if (emailVerified !== true) {
            checkEmailVerification();
          }
        }
      }, 3000); // Poll every 3 seconds - balance between responsiveness and performance
    } else {
      if (isMounted) {
        setEmailVerified(null);
      }
    }

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isAuthenticated, authUser, emailVerified]);

  // Navigation logic - simplified to prevent race conditions
  // Use ref to prevent rapid navigation attempts
  const navigationRef = React.useRef<string | null>(null);
  const lastNavigationTimeRef = React.useRef<number>(0);
  
  useEffect(() => {
    // Don't navigate if still loading - wait for all data to be ready
    if (isLoading || authLoading || businessLoading) return;

    // Debounce navigation - prevent rapid redirects (min 300ms between navigations)
    const now = Date.now();
    if (now - lastNavigationTimeRef.current < 300) {
      return;
    }

    // Get current route
    const currentPath = segments.join('/');
    
    // Prevent duplicate navigation to same route
    if (navigationRef.current === currentPath) {
      return;
    }
    
    const inAuth = currentPath.includes('landing') || currentPath.includes('sign-up') || currentPath.includes('sign-in');
    const inVerifyEmail = currentPath.includes('verify-email');
    const inOnboarding = currentPath.includes('onboarding');
    const inTabs = currentPath.includes('(tabs)') || currentPath === '';

    // Navigation decision tree - only navigate if not already on correct screen
    let targetRoute: string | null = null;

    if (!isAuthenticated) {
      // Not authenticated - go to landing (redirect away from verify-email and onboarding)
      if (!inAuth) {
        targetRoute = '/landing';
      }
    } else {
      // Authenticated - check email verification status
      // Wait a bit for email verification status to be determined (if null, wait)
      if (emailVerified === null) {
        // Still checking - don't navigate yet, but if on verify-email/onboarding and we have data, we can check
        if (hasOnboarded && (inVerifyEmail || inOnboarding)) {
          // Already onboarded - redirect away from verify-email and onboarding
          targetRoute = '/(tabs)';
        }
      } else if (emailVerified === true && inVerifyEmail) {
        // CRITICAL: If email is already verified, redirect away from verify-email screen immediately
        if (hasOnboarded) {
          targetRoute = '/(tabs)';
        } else {
          targetRoute = '/onboarding';
        }
      } else if (emailVerified === false) {
        // Email not verified - go to verify-email (unless already there or coming from sign-up)
        if (!inVerifyEmail && !inAuth) {
          targetRoute = '/verify-email';
        }
      } else if (hasOnboarded && inOnboarding) {
        // CRITICAL: If already onboarded, redirect away from onboarding screen immediately
        targetRoute = '/(tabs)';
      } else if (!hasOnboarded) {
        // Not onboarded - go to onboarding (navigate even if on verify-email to show onboarding)
        if (!inOnboarding && !inAuth) {
          targetRoute = '/onboarding';
        }
      } else if (!inTabs && !inAuth) {
        // Authenticated, verified, onboarded - go to main app
        targetRoute = '/(tabs)';
      }
    }

    // Perform navigation if needed
    if (targetRoute && targetRoute !== currentPath) {
      navigationRef.current = targetRoute;
      lastNavigationTimeRef.current = now;
      router.replace(targetRoute as any);
    } else {
      navigationRef.current = currentPath;
    }
  }, [isAuthenticated, hasOnboarded, emailVerified, isLoading, authLoading, businessLoading, segments, router]);

  // Always render the Stack navigator so routes are available
  // Show loading screen as overlay if needed
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
      {showLoadingScreen || isLoading ? (
        <LoadingScreen message="Loading DreamBiz..." />
      ) : null}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Hide native splash screen immediately - our custom loading screen will take over
    (async () => {
      try {
        // Hide immediately, no delay - custom LoadingScreen will show right away
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore errors
      }
    })();
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
