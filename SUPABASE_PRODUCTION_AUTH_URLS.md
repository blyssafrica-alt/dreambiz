# Supabase Auth URLs for Production

## Overview
This guide explains what URLs you need to configure in your Supabase Dashboard for production authentication.

## Step 1: Configure Site URL

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL** to:
   ```
   https://dreambiz.app
   ```
   (Or your actual production domain if different)

## Step 2: Configure Redirect URLs

In **Authentication** → **URL Configuration** → **Redirect URLs**, add these URLs:

### For Mobile Apps (React Native/Expo):

```
dreambiz://
dreambiz://**
dreambiz://auth/callback
exp://
```

### For Web (if you have a web version):

```
https://dreambiz.app/**
https://dreambiz.app/auth/callback
https://dreambiz.app/*
```

### For Development (keep these for testing):

```
exp://localhost:8081
exp://192.168.*.*:8081
exp://127.0.0.1:8081
```

## Step 3: App Scheme Configuration

Your app is already configured with the scheme `dreambiz` in `app.json`:

```json
"scheme": "dreambiz"
```

This means your deep link URLs will be:
- **iOS**: `dreambiz://`
- **Android**: `dreambiz://`

## Step 4: OAuth Provider URLs (if using OAuth)

If you plan to use OAuth providers (Google, Apple, etc.), configure these:

### Google OAuth:
- **Authorized redirect URIs** in Google Console:
  ```
  https://oqcgerfjjiozltkmmkxf.supabase.co/auth/v1/callback
  ```

### Apple OAuth:
- **Return URLs** in Apple Developer:
  ```
  https://oqcgerfjjiozltkmmkxf.supabase.co/auth/v1/callback
  ```

## Step 5: Email Templates (Optional)

In **Authentication** → **Email Templates**, you can customize:
- **Confirm signup** email
- **Magic Link** email
- **Change Email Address** email
- **Reset Password** email

For production, update the redirect URLs in these templates to:

**For Web:**
```
https://dreambiz.app/auth/callback
```

**For Mobile Apps:**
```
dreambiz://auth/callback
```

**Note:** The `dreambiz://**` wildcard allows all paths, but it's also good to include the specific callback path `dreambiz://auth/callback` for explicit routing.

## Complete Supabase Dashboard Configuration

### Authentication → URL Configuration:

**Site URL:**
```
https://dreambiz.app
```

**Redirect URLs (add all of these):**
```
dreambiz://
dreambiz://**
dreambiz://auth/callback
exp://
https://dreambiz.app/**
https://dreambiz.app/auth/callback
exp://localhost:8081
exp://192.168.*.*:8081
```

## Important Notes

1. **Wildcards**: Use `**` for web URLs to allow all paths
2. **Mobile Deep Links**: `dreambiz://` is your app's custom URL scheme
3. **Expo Development**: Keep `exp://` URLs for development builds
4. **No Trailing Slash**: For mobile schemes, don't add trailing slashes
5. **HTTPS Required**: All web URLs must use HTTPS in production

## Testing

After configuring:

1. **Test Sign Up**: Create a new account and verify email redirect works
2. **Test Sign In**: Sign in and verify redirect works
3. **Test Password Reset**: Request password reset and verify email link works
4. **Test OAuth** (if enabled): Test Google/Apple sign-in flows

## Troubleshooting

### "Invalid redirect URL" error:
- Check that the redirect URL exactly matches one in your Supabase dashboard
- Ensure no trailing slashes for mobile schemes
- Verify the scheme matches your `app.json` scheme

### Email links not working:
- Check email template redirect URLs
- Verify Site URL is set correctly
- Ensure redirect URLs include the callback path
- Use `dreambiz://auth/callback` for email link redirects

### Deep links not working on mobile:
- Verify `scheme` in `app.json` matches Supabase redirect URLs
- Check that app is properly configured for deep linking
- Test with `npx uri-scheme open dreambiz:// --ios` or `--android`

## Current Configuration

Based on your `app.json`:
- **App Scheme**: `dreambiz`
- **Supabase URL**: `https://oqcgerfjjiozltkmmkxf.supabase.co`
- **Production Domain**: (Set this to your actual domain)

## Quick Setup Checklist

- [ ] Set Site URL in Supabase Dashboard
- [ ] Add `dreambiz://` to Redirect URLs (base scheme)
- [ ] Add `dreambiz://**` to Redirect URLs (wildcard for all paths)
- [ ] Add `dreambiz://auth/callback` to Redirect URLs (specific callback)
- [ ] Add `exp://` to Redirect URLs (for development)
- [ ] Add web URLs if you have a web version
- [ ] Update email template redirect URLs to `dreambiz://auth/callback`
- [ ] Configure OAuth provider redirect URLs (if using OAuth)
- [ ] Test sign up flow
- [ ] Test sign in flow
- [ ] Test password reset flow

## Recommended Redirect URLs Summary

**Minimum Required:**
```
dreambiz://
dreambiz://auth/callback
```

**Recommended (with wildcards):**
```
dreambiz://
dreambiz://**
dreambiz://auth/callback
```

**Why both?**
- `dreambiz://` - Base scheme, catches root redirects
- `dreambiz://**` - Wildcard, allows any path (e.g., `dreambiz://anything/here`)
- `dreambiz://auth/callback` - Specific callback path for explicit routing

