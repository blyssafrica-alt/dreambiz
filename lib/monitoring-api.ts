/**
 * Monitoring API Client
 * Fetches data from Sentry and PostHog APIs for admin dashboard
 */

interface SentryError {
  id: string;
  title: string;
  count: number;
  lastSeen: string;
  level: string;
  status: string;
}

interface SentryStats {
  totalErrors: number;
  unresolvedErrors: number;
  errorsLast24h: number;
  recentErrors: SentryError[];
}

interface PostHogEvent {
  event: string;
  count: number;
  lastSeen: string;
}

interface PostHogStats {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  totalEvents: number;
  topEvents: PostHogEvent[];
}

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Extract Sentry organization and project from DSN
function getSentryOrgAndProject(): { org: string | null; project: string | null } {
  try {
    // DSN format: https://[key]@[host]/[project-id]
    const match = SENTRY_DSN.match(/@[^/]+\/(\d+)/);
    if (match) {
      // For now, we'll need the org slug separately or extract from URL
      // This is a simplified version - you may need to configure org/project separately
      return { org: null, project: match[1] };
    }
  } catch (e) {
    // Ignore errors
  }
  return { org: null, project: null };
}

/**
 * Fetch Sentry error statistics
 * Note: This requires Sentry API token for authentication
 * You'll need to set EXPO_PUBLIC_SENTRY_AUTH_TOKEN in your .env
 */
export async function getSentryStats(): Promise<SentryStats | null> {
  if (!SENTRY_DSN) {
    return null;
  }

  const authToken = process.env.EXPO_PUBLIC_SENTRY_AUTH_TOKEN;
  if (!authToken) {
    // Without auth token, we can't fetch from Sentry API
    // Return null and show a message to configure it
    return null;
  }

  try {
    const { org, project } = getSentryOrgAndProject();
    if (!org || !project) {
      return null;
    }

    // Note: This is a simplified example
    // Actual Sentry API requires organization slug and different endpoints
    // You'll need to configure these based on your Sentry setup
    
    const response = await fetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentErrors = data
      .filter((error: any) => new Date(error.lastSeen) > last24h)
      .slice(0, 10)
      .map((error: any) => ({
        id: error.id,
        title: error.title,
        count: error.count,
        lastSeen: error.lastSeen,
        level: error.level,
        status: error.status,
      }));

    return {
      totalErrors: data.length,
      unresolvedErrors: data.filter((e: any) => e.status !== 'resolved').length,
      errorsLast24h: recentErrors.length,
      recentErrors,
    };
  } catch (error) {
    console.error('Failed to fetch Sentry stats:', error);
    return null;
  }
}

/**
 * Fetch PostHog analytics statistics
 */
export async function getPostHogStats(): Promise<PostHogStats | null> {
  if (!POSTHOG_API_KEY) {
    return null;
  }

  try {
    // PostHog API endpoint for insights
    const response = await fetch(
      `${POSTHOG_HOST}/api/projects/insights/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
        },
        body: JSON.stringify({
          // Request user and event statistics
          // This is a simplified example - adjust based on PostHog API docs
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    // This is a simplified example
    // Actual PostHog API integration will vary based on your needs
    return {
      totalUsers: 0,
      activeUsers24h: 0,
      activeUsers7d: 0,
      totalEvents: 0,
      topEvents: [],
    };
  } catch (error) {
    console.error('Failed to fetch PostHog stats:', error);
    return null;
  }
}

/**
 * Get monitoring status (whether services are configured)
 */
export function getMonitoringStatus() {
  return {
    sentryConfigured: !!SENTRY_DSN,
    posthogConfigured: !!POSTHOG_API_KEY,
    sentryAuthTokenConfigured: !!process.env.EXPO_PUBLIC_SENTRY_AUTH_TOKEN,
  };
}

export default {
  getSentryStats,
  getPostHogStats,
  getMonitoringStatus,
};

