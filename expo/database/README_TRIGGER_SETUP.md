# Database Trigger Setup for User Profiles

## Problem
Row Level Security (RLS) policies prevent the application from creating user profiles in the `users` table, causing errors during onboarding.

## Solution
A database trigger automatically creates user profiles when users sign up in Supabase Auth, bypassing RLS restrictions. An RPC function allows syncing existing users.

## Setup Instructions

### Step 1: Set Up the Trigger and RPC Function

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Trigger SQL**
   - Open the file `database/create_user_profile_trigger.sql`
   - Copy the **ENTIRE** contents (all 82 lines)
   - Paste into the SQL Editor
   - Click **Run** to execute
   - You should see "Success. No rows returned" if it worked

3. **Verify Setup**
   - Run this query to check the trigger exists:
     ```sql
     SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
     ```
   - Run this to check the RPC function exists:
     ```sql
     SELECT * FROM pg_proc WHERE proname = 'sync_user_profile';
     ```

### Step 2: Sync Existing Users

If you have existing users in `auth.users` without profiles in `users` table:

**Option A: Sync All Users (Recommended)**
```sql
SELECT public.sync_existing_users();
```

**Option B: Sync a Specific User**
```sql
SELECT public.sync_user_profile('your-user-id-here');
```

**Option C: Use the Script**
```bash
node scripts/sync-user-profile.js <user-id>
# Or
bun run scripts/sync-user-profile.js <user-id>
```

## How It Works

- **Trigger**: When a new user signs up in `auth.users`, the `on_auth_user_created` trigger automatically creates a corresponding profile in the `users` table
- **RPC Function**: The `sync_user_profile` function can be called from the app to sync existing users
- **SECURITY DEFINER**: Both use `SECURITY DEFINER` to bypass RLS policies
- **Idempotent**: If a profile already exists, operations do nothing (no error)

## Verification

After setting up the trigger:
1. Sign up a new user in the app
2. Check the `users` table in Supabase - the profile should be created automatically
3. Try onboarding - it should work without RLS errors

## Troubleshooting

### Error: "User profile could not be created due to RLS restrictions"

**Solution**: The trigger/RPC function is not set up. Follow Step 1 above.

### Error: "406 (Not Acceptable)" when calling RPC

**Solution**: The RPC function might not be set up or has wrong parameters. Re-run the SQL in `database/create_user_profile_trigger.sql`.

### Error: "Foreign key constraint violation"

**Solution**: The user profile doesn't exist in the `users` table. Sync the user:
```sql
SELECT public.sync_user_profile('user-id-here');
```

### Check if Trigger is Working

Run these queries in Supabase SQL Editor:
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check functions exist
SELECT proname FROM pg_proc WHERE proname IN ('handle_new_user', 'sync_user_profile', 'sync_existing_users');

-- Test RPC function (replace with your user ID)
SELECT public.sync_user_profile('your-user-id-here');
```

### Manual Profile Creation (Last Resort)

If nothing else works, you can manually create the profile in Supabase Dashboard:
1. Go to **Table Editor** > **users**
2. Click **Insert** > **Insert row**
3. Fill in:
   - `id`: The user ID from `auth.users` table
   - `email`: The user's email
   - `name`: The user's name
   - `password_hash`: Leave empty
   - `is_super_admin`: false

