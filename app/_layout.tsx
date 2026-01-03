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

  // Hide loading screen after initial load - longer duration to appreciate the beautiful design
  React.useEffect(() => {
    if (!isLoading && !authLoading && !businessLoading) {
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
      }, 3000); // Longer delay (3 seconds) to appreciate the beautiful loading screen design
      return () => clearTimeout(timer);
    }
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
          setEmailVerified(isVerified);
          console.log('Email verification status:', isVerified ? 'Verified' : 'Not verified');
          
          // If verified, clear the interval to stop polling
          if (isVerified && checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
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
      checkEmailVerification();
      
      // Poll every 2 seconds while on verify-email screen to catch verification quickly
      // This helps when user clicks email link and returns to app
      checkInterval = setInterval(() => {
        if (isMounted) {
          checkEmailVerification();
        }
      }, 2000);
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
  }, [isAuthenticated, authUser]);

  useEffect(() => {
    // Don't navigate if still loading or loading screen is showing
    if (isLoading || showLoadingScreen) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // Use requestAnimationFrame to ensure component is fully mounted before navigation
    const navigationFrame = requestAnimationFrame(() => {
      if (!isMounted) return;

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
      // But don't wait if we're already on the verify-email screen (let it handle its own state)
      if (emailVerified === null && isAuthenticated && !inVerifyEmail) {
        // Wait a maximum of 3 seconds for email verification check
        // After that, assume not verified to be safe
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setEmailVerified((prev) => {
              if (prev === null) {
                console.log('Email verification check timed out, assuming not verified');
                return false;
              }
              return prev;
            });
          }
        }, 3000);
        return;
      }

      // CRITICAL: If authenticated but email not verified, redirect to verification screen
      // This must happen BEFORE checking onboarding status
      // BUT: Before redirecting, double-check the session to avoid race conditions
      // This prevents redirecting back to verify-email after user just verified
      if (isAuthenticated && emailVerified === false) {
        if (!inVerifyEmail && !inAuth) {
          // IMPORTANT: If we're already on onboarding or tabs, don't redirect
          // This prevents the loop where user verifies -> goes to dashboard -> gets redirected back
          // The user might have just verified and we're in a transition state
          if (inOnboarding || inTabs) {
            // Double-check session - if verified, update state instead of redirecting
            (async () => {
              try {
                await supabase.auth.refreshSession();
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.email_confirmed_at) {
                  console.log('User is verified (on onboarding/tabs) - updating state');
                  if (isMounted) {
                    setEmailVerified(true);
                  }
                }
              } catch (error) {
                console.error('Error checking session:', error);
              }
            })();
            // Don't redirect - let user stay on onboarding/tabs
            return;
          }
          
          // For other screens, double-check session before redirecting
          (async () => {
            try {
              // Refresh session first to get latest status
              await supabase.auth.refreshSession();
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user?.email_confirmed_at) {
                // User is actually verified - update state instead of redirecting
                console.log('Session shows verified - updating state instead of redirecting');
                if (isMounted) {
                  setEmailVerified(true);
                }
                return; // Don't redirect
              }
              // Session confirms not verified - safe to redirect
              console.log('Redirecting to verify-email: email not verified (confirmed by session check)');
              if (isMounted) {
                router.replace('/verify-email' as any);
              }
            } catch (error) {
              console.error('Error checking session before redirect:', error);
              // On error, don't redirect - let user stay where they are
            }
          })();
        }
        return; // Return early while async check happens
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
      // But only if email is verified (to prevent redirecting before verification)
      if (isAuthenticated && emailVerified === true && hasOnboarded && (inAuth || inOnboarding || inVerifyEmail)) {
        router.replace('/(tabs)' as any);
        return;
      }
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(navigationFrame);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAuthenticated, hasOnboarded, emailVerified, isLoading, showLoadingScreen, segments, router]);

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
