// Import gesture handler FIRST - this is critical for touch events
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Initialize monitoring services BEFORE any other imports
import { initMonitoring } from '@/lib/monitoring';

// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { BusinessContext, useBusiness } from "@/contexts/BusinessContext";
import { AuthContext, useAuth } from "@/contexts/AuthContext";
import { ThemeContext, useTheme } from "@/contexts/ThemeContext";
import { ProviderContext } from "@/contexts/ProviderContext";
import { FeatureContextProvider } from "@/contexts/FeatureContext";
import { ProductContextProvider } from "@/contexts/ProductContext";
import { AdContextProvider } from "@/contexts/AdContext";
import { PremiumContextProvider } from "@/contexts/PremiumContext";
import { SettingsContext } from "@/contexts/SettingsContext";
import NotificationBootstrap from "@/components/NotificationBootstrap";
import { StatusBar, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';
import { useSupplierFlowState } from '@/hooks/useSupplierFlowState';
import { isSupplierFlowPath } from '@/lib/supplier-flow';

const SUPPLIER_INTENT_KEY = 'SUPPLIER_INTENT';

SplashScreen.preventAutoHideAsync();

// Initialize monitoring (Sentry, PostHog)
initMonitoring();

if (!__DEV__) {
  // Disable noisy logs in production builds.
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hasOnboarded, isLoading: businessLoading, isEmployee } = useBusiness();
  const { isAuthenticated, isLoading: authLoading, authUser } = useAuth();
  const { theme, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [emailVerified, setEmailVerified] = React.useState<boolean | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = React.useState(true);
  const hasCompletedInitialLoad = React.useRef(false);

  const currentPath = segments.join('/');
  const pathWithSlash = currentPath ? (currentPath.startsWith('/') ? currentPath : '/' + currentPath) : '/';
  const inSupplierFlowPath = isSupplierFlowPath(pathWithSlash);

  const supplierFlow = useSupplierFlowState({
    userId: authUser?.id ?? null,
    email: authUser?.email ?? null,
    emailVerified: emailVerified ?? false,
    onboardingComplete: hasOnboarded,
    isEmployee,
    enabled: inSupplierFlowPath,
  });

  const isLoading = businessLoading || authLoading;

  // Hide loading screen after initial load completes - prevent flicker with debouncing
  const loadingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  React.useEffect(() => {
    // Clear any pending timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    if (!isLoading && !authLoading && !businessLoading) {
      // Small delay to prevent flicker if loading state changes rapidly
      loadingTimeoutRef.current = setTimeout(() => {
        setShowLoadingScreen(false);
        hasCompletedInitialLoad.current = true;
      }, 100);
    } else if (!hasCompletedInitialLoad.current) {
      // Only show the loading screen during the initial load to avoid blinking
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

    const checkEmailVerification = async () => {
      // Only check if user is authenticated
      if (!isAuthenticated || !authUser) {
        if (isMounted) {
          setEmailVerified(null);
        }
        return;
      }

      try {
        // First check if we have a session before trying to refresh
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) {
          // No session yet - this can happen right after sign-up
          if (isMounted) {
            setEmailVerified(null);
          }
          return;
        }
 
        // Use current session without forcing refresh to avoid auth flicker
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
    } else {
      if (isMounted) {
        setEmailVerified(null);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authUser]);

  // Navigation logic - simplified to prevent race conditions
  // Use ref to prevent rapid navigation attempts
  const navigationRef = React.useRef<string | null>(null);
  const lastNavigationTimeRef = React.useRef<number>(0);
  
  useEffect(() => {
    // Get current route first
    const currentPath = segments.join('/');
    const inAuth =
      currentPath.includes('landing') ||
      currentPath.includes('sign-up') ||
      currentPath.includes('sign-in') ||
      currentPath.includes('employee-login');
    const inSupplierEntry = currentPath.includes('supplier-apply') || currentPath.includes('supplier-login');
    const inVerifyEmail = currentPath.includes('verify-email');
    const inOnboarding = currentPath.includes('onboarding');
    const inAdmin = currentPath.includes('admin');
    const inTabs = currentPath.includes('(tabs)') || currentPath === '';
    // Routes that are valid for authenticated users but outside tabs
    const allowedNonTabRoutes = ['books', 'my-library', 'my-purchases', 'my-ads', 'business-plan', 'help', 'receipt-scan', 'document', 'subscription', 'payments', 'legal', 'financial-tools', 'suppliers-marketplace', 'supplier', 'rfq', 'purchase-orders', 'reorder-suggestions'];
    const inAllowedNonTabRoute = allowedNonTabRoutes.some(route => currentPath.includes(route));

    // Use authUser as source of truth for authentication (more reliable than isAuthenticated computed value)
    const actuallyAuthenticated = !!authUser || isAuthenticated;
    const effectiveHasOnboarded = isEmployee ? true : hasOnboarded;
    const effectiveEmailVerified = isEmployee ? true : emailVerified;

    // CRITICAL: Always allow navigation from auth screens when authenticated, even while loading
    // This is the key fix - don't block navigation after sign-in
    const canNavigateWhileLoading = actuallyAuthenticated && inAuth && !authLoading;
    
    // Don't navigate if still loading, UNLESS we need to get user off auth screen
    if ((isLoading || authLoading || businessLoading) && !canNavigateWhileLoading) {
      return;
    }

    // Debounce navigation - prevent rapid redirects (min 200ms between navigations - reduced for responsiveness)
    const now = Date.now();
    if (now - lastNavigationTimeRef.current < 200) {
      return;
    }

    // Reset navigation ref if route has legitimately changed
    if (navigationRef.current && navigationRef.current !== currentPath) {
      navigationRef.current = null;
    }
    
    // Prevent duplicate navigation to same route
    if (navigationRef.current === currentPath && actuallyAuthenticated) {
      return;
    }

    // Navigation decision tree
    let targetRoute: string | null = null;

    if (!actuallyAuthenticated) {
      // Not authenticated - go to landing (allow supplier entry points)
      if (!inAuth && !inSupplierEntry) {
        targetRoute = '/landing';
      }
    } else {
      // Authenticated - PRIORITY: Get off auth screens first
      if (inAuth) {
        // On auth screen but authenticated - navigate away IMMEDIATELY
        if (effectiveHasOnboarded) {
          targetRoute = '/(tabs)';
        } else {
          // Not onboarded - navigate based on email verification status
          if (effectiveEmailVerified === true) {
            targetRoute = '/onboarding';
          } else {
            // Email not verified or status unknown - go to verify-email
            targetRoute = '/verify-email';
          }
        }
      } else if (effectiveEmailVerified === true && inVerifyEmail) {
        // Email verified - redirect away from verify-email
        if (effectiveHasOnboarded) {
          targetRoute = '/(tabs)';
        } else {
          targetRoute = '/onboarding';
        }
      } else if (effectiveEmailVerified === false && !inVerifyEmail && !inAuth) {
        // Email not verified - go to verify-email (if not already there)
        targetRoute = '/verify-email';
      } else if (effectiveHasOnboarded) {
        // Already onboarded - redirect away from verify-email/onboarding to tabs
        // But don't redirect if user is in admin section or allowed non-tab routes
        if (inVerifyEmail || inOnboarding) {
          targetRoute = '/(tabs)';
        } else if (!inTabs && !inAdmin && !inAllowedNonTabRoute) {
          targetRoute = '/(tabs)';
        }
      } else if (!effectiveHasOnboarded && effectiveEmailVerified === true && !inOnboarding && !inAuth) {
        // Email verified but not onboarded - go to onboarding
        targetRoute = '/onboarding';
      }
    }

    // Perform navigation if needed
    if (targetRoute && targetRoute !== currentPath) {
      navigationRef.current = targetRoute;
      lastNavigationTimeRef.current = now;
      if (targetRoute === '/(tabs)') {
        AsyncStorage.getItem(SUPPLIER_INTENT_KEY).then((intent) => {
          if (intent === 'true') {
            AsyncStorage.removeItem(SUPPLIER_INTENT_KEY);
            router.replace('/supplier-apply' as any);
          } else {
            router.replace(targetRoute as any);
          }
        });
      } else {
        router.replace(targetRoute as any);
      }
    } else if (!targetRoute && inAuth && actuallyAuthenticated) {
      // Emergency fallback: if authenticated but stuck on auth screen with no target route
      // Force navigation to prevent getting stuck
      const fallbackRoute = hasOnboarded ? '/(tabs)' : '/verify-email';
      if (fallbackRoute !== currentPath) {
        navigationRef.current = fallbackRoute;
        lastNavigationTimeRef.current = now;
        router.replace(fallbackRoute as any);
      }
    } else if (actuallyAuthenticated) {
      // Track current path for authenticated users
      navigationRef.current = currentPath;
    }
  }, [isAuthenticated, hasOnboarded, emailVerified, isLoading, authLoading, businessLoading, segments, router, authUser]);

  // Deep link: when app opens from auth link (e.g. email verify), refresh session so state is correct
  React.useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      if (url.includes('access_token=') || url.includes('refresh_token=') || url.includes('type=recovery')) {
        try {
          await supabase.auth.getSession();
        } catch (_) {}
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Supplier flow route guard: enforce single allowed route per state (no bypass via URL)
  React.useEffect(() => {
    if (!inSupplierFlowPath || supplierFlow.isLoading || supplierFlow.isFetching) return;
    const state = supplierFlow.state;
    const expectedRoute = supplierFlow.expectedRoute;
    if (!state || !expectedRoute) return;

    const pathNorm = pathWithSlash.replace(/\/$/, '') || '/';
    const expectedNorm = expectedRoute.replace(/\/$/, '') || '/';

    if (state === 'NOT_LOGGED_IN') {
      if (pathNorm.includes('supplier-apply') || pathNorm.includes('supplier-login')) return;
      router.replace('/landing' as any);
      return;
    }
    // NO_APPLICATION: don't redirect from Supplier Dashboard - let supplier/_layout show "need approved profile" screen
    if (state === 'NO_APPLICATION' && (pathNorm === '/supplier' || pathNorm.startsWith('/supplier/'))) return;
    // NO_APPLICATION: allow become-a-supplier so we don't redirect back to supplier-apply after it just sent user here (avoids flicker/loop)
    if (state === 'NO_APPLICATION' && (pathNorm === '/suppliers-marketplace/become-a-supplier' || pathNorm.startsWith('/suppliers-marketplace/become-a-supplier/'))) return;
    if (pathNorm !== expectedNorm && !pathNorm.startsWith(expectedNorm + '/')) {
      router.replace(expectedRoute as any);
    }
  }, [inSupplierFlowPath, pathWithSlash, supplierFlow.state, supplierFlow.expectedRoute, supplierFlow.isLoading, supplierFlow.isFetching, router]);

  // Always render the Stack navigator so routes are available
  // Show loading screen as overlay if needed
  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background.primary} />
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
        <Stack.Screen name="subscription" options={{ title: 'Subscription', headerShown: false }} />
        <Stack.Screen name="books" options={{ headerShown: false }} />
        <Stack.Screen name="my-library" options={{ title: 'My Library', headerShown: false }} />
        <Stack.Screen name="my-purchases" options={{ title: 'My Purchases', headerShown: false }} />
        <Stack.Screen name="my-ads" options={{ title: 'My Ads', headerShown: false }} />
        <Stack.Screen name="receipt-scan" options={{ title: 'Scan Receipt', headerShown: false }} />
        <Stack.Screen name="payments" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="supplier-apply" options={{ headerShown: false }} />
        <Stack.Screen name="supplier-login" options={{ headerShown: false }} />
        <Stack.Screen name="suppliers-marketplace" options={{ headerShown: false }} />
        <Stack.Screen name="supplier" options={{ headerShown: false }} />
        <Stack.Screen name="rfq" options={{ headerShown: false }} />
        <Stack.Screen name="purchase-orders" options={{ headerShown: false }} />
        <Stack.Screen name="reorder-suggestions" options={{ headerShown: false }} />
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
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to hide splash screen:', error);
        }
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
                      <AdContextProvider>
                        <ProductContextProvider>
                          <NotificationBootstrap />
                          <RootLayoutNav />
                        </ProductContextProvider>
                      </AdContextProvider>
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
