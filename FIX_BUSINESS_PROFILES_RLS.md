# Fix: "new row violates row-level security policy for table business_profiles"

## Problem
When users try to complete onboarding and save their business profile, they get this error:
> "Failed to save business: new row violates row-level security policy for table 'business_profiles'"
> Error code: 42501

## Root Cause
The Row Level Security (RLS) policies for the `business_profiles` table are either:
1. Not set up correctly
2. Using incorrect type comparisons
3. Missing entirely

## Solution (5 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Set SQL Editor Mode
**IMPORTANT:** In the SQL Editor, change the dropdown from "RLS disabled" to **"No limit"**

### Step 3: Run the RLS Fix SQL
1. Open the file `database/fix_business_profiles_rls.sql` in this project
2. Copy **ALL** the contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success" message ✅

### Step 4: Verify Policies Were Created
Run this query to check:

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

You should see 4 policies:
- ✅ Users can view their own business
- ✅ Users can insert their own business
- ✅ Users can update their own business
- ✅ Users can delete their own business

## What This Does

The SQL file:
1. **Enables RLS** on `business_profiles` table
2. **Drops old policies** (if they exist) to avoid conflicts
3. **Creates new policies** that allow:
   - Users to view their own business profiles
   - Users to **insert** their own business profiles (critical for onboarding!)
   - Users to update their own business profiles
   - Users to delete their own business profiles
4. **Uses UUID comparison** (`auth.uid() = user_id`) instead of text comparison

## Key Policy for Onboarding

The most important policy is:
```sql
CREATE POLICY "Users can insert their own business" ON public.business_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

This allows users to create their first business profile during onboarding.

## After Setup

1. **Test onboarding**: Have a user complete the onboarding flow
2. **Verify no errors**: The "row-level security policy" error should be gone
3. **Check business was created**: 
   ```sql
   SELECT * FROM public.business_profiles WHERE user_id = auth.uid();
   ```

## Troubleshooting

### Still Getting RLS Error?

1. **Check if policies exist:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'business_profiles';
   ```
   Should return 4 rows.

2. **Check if RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'business_profiles';
   ```
   `rowsecurity` should be `true`.

3. **Verify user_id matches auth.uid():**
   ```sql
   SELECT auth.uid() as auth_user_id;
   ```
   Compare this with the `user_id` being used in the app.

4. **Check if user profile exists:**
   ```sql
   SELECT * FROM public.users WHERE id = auth.uid();
   ```
   Should return 1 row.

### User ID Mismatch?

If `user_id` doesn't match `auth.uid()`, the RLS policy will block the insert. The app now logs this mismatch to help debug.

## Quick Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Changed dropdown to "No limit"
- [ ] Copied entire contents of `database/fix_business_profiles_rls.sql`
- [ ] Pasted and ran in SQL Editor
- [ ] Got "Success" message
- [ ] Verified 4 policies exist (using query above)
- [ ] Tested onboarding with a new user
- [ ] Confirmed no more RLS errors

## Prevention

Once the RLS policies are correctly set up, all users will be able to:
- ✅ Create their business profile during onboarding
- ✅ View their own business profile
- ✅ Update their own business profile
- ✅ Delete their own business profile (if needed)

The error should not occur after this setup.

