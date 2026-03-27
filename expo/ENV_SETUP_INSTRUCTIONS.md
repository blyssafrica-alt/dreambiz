# Environment Variables Setup

Your Sentry DSN and PostHog API key have been configured in `app.config.js` as fallback values. However, for best practices, you should also add them to your `.env` file.

## Update Your .env File

Create or update `.env` in the root directory with these values:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://oqcgerfjjiozltkmmkxf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_959ZId8aR4E5IjTNoyVsJQ_xt8pelvp

# OCR Space API (Optional)
EXPO_PUBLIC_OCR_SPACE_API_KEY=K82828017188957

# Sentry Configuration (Error Tracking)
EXPO_PUBLIC_SENTRY_DSN=https://ddcc3b51c7eddd52998ae5bafac64081@o4510641613504512.ingest.de.sentry.io/4510641637163088
EXPO_PUBLIC_SENTRY_ORG=
EXPO_PUBLIC_SENTRY_PROJECT=
EXPO_PUBLIC_SENTRY_URL=https://sentry.io/

# PostHog Configuration (Analytics)
EXPO_PUBLIC_POSTHOG_API_KEY=phc_nJp7XKtyWcArFPz0Kko7dOfq5MrKpEyMIIChHrGKsg1
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Verification

After updating your `.env` file:

1. **Restart your development server**:
   ```bash
   npm start
   ```

2. **Check the console** for initialization messages:
   - `✅ Sentry initialized successfully`
   - `✅ PostHog initialized successfully`

3. **Test error tracking**:
   - Trigger an error in your app
   - Check your Sentry dashboard to see if the error was captured

4. **Test analytics**:
   - Use the app normally
   - Check your PostHog dashboard to see events being tracked

## Current Status

✅ **Sentry DSN**: Configured in `app.config.js`  
✅ **PostHog API Key**: Configured in `app.config.js`  
⚠️ **.env file**: Update manually (recommended for production)

The app will work with the values in `app.config.js`, but using `.env` is recommended for:
- Environment-specific configurations
- Keeping secrets out of version control
- Easier deployment to different environments

