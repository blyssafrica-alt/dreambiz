# Fix: "Security restriction: Unable to create user profile" Error

## Problem
When users complete onboarding and select their book, they see this error:
> "Security restriction: Unable to create user profile. Please ensure the database trigger is set up..."

## Root Cause
The database trigger that automatically creates user profiles when users sign up is not set up in your Supabase database.

## Solution (5 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Set SQL Editor Mode
**IMPORTANT:** In the SQL Editor, change the dropdown from "RLS disabled" to **"No limit"** (this allows the trigger to run with proper permissions)

### Step 3: Run the Trigger SQL
1. Open the file `database/create_user_profile_trigger.sql` in this project
2. Copy **ALL** the contents (all 159 lines)
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success. No rows returned" message ✅

### Step 4: Sync Existing Users
If you already have users who signed up before the trigger was set up, run this:

```sql
SELECT public.sync_existing_users();
```

Or to sync a specific user:
```sql
SELECT public.sync_user_profile('user-id-here'::UUID);
```

### Step 5: Verify It Works
1. Check that the trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
(Should return 1 row)

2. Check that the RPC function exists:
```sql
SELECT * FROM pg_proc WHERE proname = 'sync_user_profile';
```
(Should return 1 row)

## What This Does

- **Trigger**: Automatically creates a user profile in the `users` table when someone signs up
- **RPC Function**: Allows the app to manually sync user profiles if needed
- **Bypasses RLS**: Uses `SECURITY DEFINER` to bypass Row Level Security restrictions

## After Setup

1. **Test with a new user**: Have someone sign up and complete onboarding
2. **If error persists**: Check the console logs for more details
3. **For existing users**: Run `SELECT public.sync_existing_users();` to create profiles for users who signed up before the trigger was set up

## Quick Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Changed dropdown to "No limit"
- [ ] Copied entire contents of `database/create_user_profile_trigger.sql`
- [ ] Pasted and ran in SQL Editor
- [ ] Got "Success" message
- [ ] Ran `SELECT public.sync_existing_users();` for existing users
- [ ] Tested onboarding with a new user

## Still Having Issues?

1. **Check the trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. **Check the function exists:**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'sync_user_profile';
   ```

3. **Manually sync a user:**
   ```sql
   SELECT public.sync_user_profile('user-id-from-error-message'::UUID);
   ```

4. **Check if user profile exists:**
   ```sql
   SELECT * FROM public.users WHERE id = 'user-id-here';
   ```

## Prevention

Once the trigger is set up, all new users will automatically get profiles created when they sign up. The error should not occur for new users after this setup.

