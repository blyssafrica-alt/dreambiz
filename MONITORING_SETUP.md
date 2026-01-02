# Monitoring & Analytics Setup Guide

This guide explains how to set up error monitoring, analytics, logging, and performance monitoring for the DreamBiz app.

## 📦 Installed Packages

- `@sentry/react-native` - Error tracking and performance monitoring
- `posthog-react-native` - Product analytics and event tracking

## 🔧 Configuration

### 1. Environment Variables

Create a `.env` file in the root directory (or set in your build environment):

```env
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
EXPO_PUBLIC_SENTRY_ORG=your-org
EXPO_PUBLIC_SENTRY_PROJECT=your-project
EXPO_PUBLIC_SENTRY_URL=https://sentry.io/

# PostHog Configuration
EXPO_PUBLIC_POSTHOG_API_KEY=phc_your-api-key
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 2. Getting Your Sentry DSN

1. Go to [sentry.io](https://sentry.io) and create an account (free tier available)
2. Create a new project (choose React Native)
3. Copy the DSN from the project settings
4. Add it to your `.env` file

### 3. Getting Your PostHog API Key

1. Go to [posthog.com](https://posthog.com) and create an account (free tier available)
2. Create a new project
3. Go to Project Settings → API Keys
4. Copy the Project API Key
5. Add it to your `.env` file

## 🚀 Usage

### Logging (Replaces console.log)

The app now uses a production-ready logger that:
- Shows colored logs in development
- Sends errors/warnings to Sentry in production
- Tracks events in PostHog in production

```typescript
import { log } from '@/lib/logger';

// Debug (development only)
log.debug('Debug message', { context: 'data' });

// Info
log.info('Information message', { userId: '123' });

// Warning (sent to Sentry in production)
log.warn('Warning message', { issue: 'description' });

// Error (sent to Sentry in production)
log.error('Error message', error, { context: 'data' });

// Performance tracking
log.performance('api_call', 150, { endpoint: '/api/users' });

// Timer helper
const endTimer = log.startTimer('expensive_operation');
// ... do work ...
endTimer(); // Automatically logs the duration
```

### Analytics Tracking

```typescript
import { trackEvent, trackScreenView, identifyUser } from '@/lib/monitoring';

// Track custom events
trackEvent('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  product_id: 'premium',
});

// Track screen views
trackScreenView('Dashboard', {
  user_type: 'premium',
});

// Identify users (call after login)
identifyUser(userId, {
  email: user.email,
  name: user.name,
  plan: 'premium',
});

// Reset user (call on logout)
import { resetUser } from '@/lib/monitoring';
resetUser();
```

### Error Tracking

Errors are automatically tracked when you use the logger:

```typescript
import { log } from '@/lib/logger';

try {
  // Your code
} catch (error) {
  log.error('Failed to process payment', error, {
    userId: user.id,
    amount: 99.99,
  });
}
```

### Performance Monitoring

Performance is automatically tracked through:
1. Sentry performance transactions
2. Custom performance metrics via logger

```typescript
import { startTransaction } from '@/lib/monitoring';

const transaction = startTransaction('api_call', 'http.client');
// ... make API call ...
transaction.finish();
```

## 📊 What Gets Tracked

### Automatic Tracking

- **Screen Views**: Tracked automatically when using `trackScreenView()`
- **Errors**: All errors logged with `log.error()` are sent to Sentry
- **Performance**: API calls and operations tracked with performance methods
- **User Sessions**: Tracked automatically by Sentry and PostHog

### Manual Tracking

- Custom events: Use `trackEvent()` for business events
- User properties: Use `identifyUser()` and `setUserProperties()`
- Feature usage: Track feature usage with custom events

## 🔒 Privacy & Data

- **No PII**: Don't log sensitive information (passwords, credit cards, etc.)
- **GDPR Compliant**: PostHog and Sentry are GDPR compliant
- **Opt-out**: Users can opt-out through app settings (to be implemented)

## 🧪 Testing

In development mode:
- All logs appear in the console with emojis
- Sentry is in debug mode
- PostHog events are still tracked (can be filtered in PostHog dashboard)

## 📈 Monitoring Dashboard

### Sentry Dashboard
- View errors and their stack traces
- See error frequency and affected users
- Performance metrics and transaction traces
- Release tracking

### PostHog Dashboard
- User analytics and behavior
- Feature usage metrics
- Custom event tracking
- User cohorts and segments

## 🛠️ Troubleshooting

### Monitoring not working?

1. **Check environment variables**: Ensure all required env vars are set
2. **Check network**: Ensure device has internet connection
3. **Check initialization**: Monitoring initializes in `app/_layout.tsx`
4. **Development mode**: Some features only work in production builds

### PostHog not tracking events?

- Ensure `EXPO_PUBLIC_POSTHOG_API_KEY` is set correctly
- Check PostHog dashboard for incoming events
- Verify network requests in browser DevTools

### Sentry not capturing errors?

- Ensure `EXPO_PUBLIC_SENTRY_DSN` is set correctly
- Check Sentry dashboard for test events
- Verify the DSN format is correct

## 📝 Best Practices

1. **Use logger instead of console.log**: Always use the logger for production code
2. **Add context**: Include relevant context when logging errors
3. **Track key events**: Track important user actions (purchases, signups, etc.)
4. **Monitor performance**: Track slow operations and optimize them
5. **Review regularly**: Check Sentry and PostHog dashboards regularly

## 🔄 Migration from console.log

To migrate existing `console.log` statements:

```typescript
// Before
console.log('User logged in', userId);
console.error('Payment failed', error);

// After
import { log } from '@/lib/logger';
log.info('User logged in', { userId });
log.error('Payment failed', error, { userId });
```

## 📚 Additional Resources

- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [PostHog React Native Docs](https://posthog.com/docs/integrate/client/react-native)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [PostHog Event Tracking](https://posthog.com/docs/product-analytics)

