# URGENT: Fix RLS Error for Business Profiles

## The Error You're Seeing
```
Failed to save business: new row violates row-level security policy for table "business_profiles"
Error code: 42501
```

## Quick Fix (2 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Set SQL Editor Mode
**CRITICAL:** In the SQL Editor, change the dropdown from "RLS disabled" to **"No limit"**

This is essential - without this, the policies won't be created properly!

### Step 3: Run the RLS Fix SQL
1. Open the file `database/fix_business_profiles_rls.sql` in this project
2. Copy **ALL** the contents (all 61 lines)
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success" message ✅

### Step 4: Verify It Worked
Run this query to check the policies were created:

```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'business_profiles'
ORDER BY policyname;
```

You should see **4 policies**:
- ✅ Users can view their own business
- ✅ Users can insert their own business
- ✅ Users can update their own business
- ✅ Users can delete their own business

### Step 5: Test
1. Refresh your app
2. Try completing onboarding again
3. The error should be gone!

## What This Does

The SQL file:
1. **Enables RLS** on `business_profiles` table
2. **Drops old policies** (if they exist) to avoid conflicts
3. **Creates new policies** that allow users to manage their own business profiles
4. **Uses text casting** (`auth.uid()::text = user_id::text`) for reliable UUID comparison

## Why This Happens

Row Level Security (RLS) is a Supabase feature that prevents unauthorized access to data. The policies need to be set up correctly so that:
- Users can create their own business profile (INSERT)
- Users can view their own business profile (SELECT)
- Users can update their own business profile (UPDATE)
- Users can delete their own business profile (DELETE)

Without these policies, Supabase blocks all operations for security.

## Still Having Issues?

If you still get the error after running the SQL:

1. **Check if RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'business_profiles';
   ```
   `rowsecurity` should be `true`.

2. **Check your current user ID:**
   ```sql
   SELECT auth.uid() as current_user_id;
   ```
   This should match the `user_id` being used in the app.

3. **Verify the policies exist:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'business_profiles';
   ```
   Should return 4 rows.

4. **Check if user profile exists:**
   ```sql
   SELECT * FROM public.users WHERE id = auth.uid();
   ```
   Should return 1 row. If not, run `database/create_user_profile_trigger.sql` first.

## Need More Help?

If the error persists, check the console logs in your app. The updated code now provides detailed logging about:
- The `user_id` being used
- The `auth.uid()` value
- Whether they match
- Any session verification issues

This will help identify if there's a mismatch between the user ID and auth.uid().

