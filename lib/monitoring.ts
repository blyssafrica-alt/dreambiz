/**
 * Monitoring and Analytics Setup
 * - Sentry for error tracking
 * - PostHog for analytics
 * - Performance monitoring
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dynamic import for PostHog to handle type issues
let PostHogClass: any;
try {
  const PostHogModule = require('posthog-react-native');
  PostHogClass = PostHogModule.default || PostHogModule;
} catch (e) {
  // PostHog not available
  PostHogClass = null;
}

// Get environment variables
const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || 
  process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const POSTHOG_API_KEY = Constants.expoConfig?.extra?.posthogApiKey || 
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = Constants.expoConfig?.extra?.posthogHost || 
  process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

const isDevelopment = __DEV__;
const isProduction = !isDevelopment;

let posthog: any = null;

/**
 * Initialize Sentry for error tracking
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    if (isDevelopment) {
      console.warn('⚠️ Sentry DSN not configured. Error tracking disabled.');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: isDevelopment,
      environment: isDevelopment ? 'development' : 'production',
      tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% of transactions in production
      profilesSampleRate: isProduction ? 0.1 : 1.0, // 10% of profiles in production
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000, // 30 seconds
      enableNative: true,
      enableNativeCrashHandling: true,
      beforeSend(event, hint) {
        // Filter out development errors
        if (isDevelopment && event.level === 'info') {
          return null;
        }
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs in production
        if (isProduction && breadcrumb.category === 'console') {
          return null;
        }
        return breadcrumb;
      },
    });

    if (isDevelopment) {
      console.log('✅ Sentry initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Initialize PostHog for analytics
 */
export function initPostHog() {
  if (!POSTHOG_API_KEY) {
    if (isDevelopment) {
      console.warn('⚠️ PostHog API key not configured. Analytics disabled.');
    }
    return;
  }

  if (!PostHogClass) {
    if (isDevelopment) {
      console.warn('⚠️ PostHog module not available');
    }
    return;
  }

  try {
    posthog = new PostHogClass(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      enableSessionReplay: false, // Disable session replay for mobile (can be enabled for web)
      captureLifecycleEvents: true,
      captureDeepLinks: true,
      enableHeatmaps: false, // Heatmaps not supported on mobile
      flushAt: 20, // Batch events (send after 20 events)
      flushInterval: 30000, // Or send every 30 seconds
    });

    if (isDevelopment) {
      console.log('✅ PostHog initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize PostHog:', error);
  }
}

/**
 * Identify a user in analytics
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (posthog) {
    posthog.identify(userId, traits);
  }
  
  // Also identify in Sentry
  Sentry.setUser({
    id: userId,
    ...traits,
  });
}

/**
 * Track an event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (posthog) {
    posthog.capture(eventName, {
      ...properties,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version || '1.0.0',
    });
  }
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, any>) {
  if (posthog) {
    posthog.setPersonProperties(properties);
  }
  
  // Also set in Sentry
  Sentry.setUser(properties);
}

/**
 * Reset user (on logout)
 */
export function resetUser() {
  if (posthog) {
    posthog.reset();
  }
  
  Sentry.setUser(null);
}

/**
 * Track screen view
 */
export function trackScreenView(screenName: string, properties?: Record<string, any>) {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, operation: string) {
  return Sentry.startTransaction({
    name,
    op: operation,
  });
}

/**
 * Get PostHog instance (for advanced usage)
 */
export function getPostHog() {
  return posthog;
}

/**
 * Initialize all monitoring services
 */
export function initMonitoring() {
  initSentry();
  initPostHog();
}

export default {
  initMonitoring,
  initSentry,
  initPostHog,
  identifyUser,
  trackEvent,
  setUserProperties,
  resetUser,
  trackScreenView,
  startTransaction,
  getPostHog,
};

