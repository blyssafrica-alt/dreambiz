# 🔧 Fix Email Confirmation Error

## Problem
Getting "Email not confirmed" error when trying to sign in.

## Quick Fix (Choose One)

### Option 1: Confirm Email via SQL (Fastest)

1. Go to **Supabase Dashboard** > **SQL Editor**
2. Run this SQL:

```sql
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'nashiezw@gmail.com';
```

3. Try logging in again

### Option 2: Disable Email Confirmation (For Development)

1. Go to **Supabase Dashboard** > **Authentication** > **Settings**
2. Scroll to **"Email Auth"** section
3. Find **"Enable email confirmations"**
4. **Uncheck** this option
5. Click **"Save"**
6. Try logging in again

### Option 3: Confirm via Dashboard

1. Go to **Supabase Dashboard** > **Authentication** > **Users**
2. Find `nashiezw@gmail.com`
3. Click the three dots (⋮) menu
4. Select **"Send confirmation email"** or manually confirm
5. Check the email inbox and click the confirmation link
6. Try logging in again

## For Production

In production, you should:
- Keep email confirmation enabled for security
- Send confirmation emails automatically
- Handle unconfirmed users gracefully in your app

## After Fixing

The super admin should be able to log in with:
- **Email**: `nashiezw@gmail.com`
- **Password**: `@12345678`

