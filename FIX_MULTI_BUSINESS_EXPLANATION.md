# Fix: Support Multiple Business Profiles Per User

## Root Cause Analysis

### The Problem
The system was designed to allow **multiple business profiles per user** (based on subscription plans), but the previous fix incorrectly enforced a UNIQUE constraint on `user_id`, which prevented users from creating multiple businesses.

### Why "query returned more than one row" Errors Occurred

1. **Incorrect UNIQUE Constraint**: The previous fix added `UNIQUE(user_id)` which prevents multiple businesses per user
2. **`.single()` Calls**: Client code used `.single()` which fails when multiple businesses exist
3. **RPC Functions Used UPSERT**: Functions used `ON CONFLICT (user_id)` which assumes one business per user
4. **SELECT INTO Without LIMIT**: Some RPC functions used `SELECT INTO` that could return multiple rows
5. **Cascading Fallback Logic**: Multiple fallback paths that all failed with the same error

## The Solution

### Database-Level Fixes (`database/fix_multi_business_support.sql`)

1. **Remove UNIQUE Constraint**
   ```sql
   ALTER TABLE public.business_profiles 
     DROP CONSTRAINT IF EXISTS business_profiles_user_id_unique;
   ```
   - Allows multiple businesses per user

2. **Remove Duplicate Cleanup Trigger**
   - Drops the trigger that was deleting "duplicates" (which are actually valid multiple businesses)

3. **Create `create_business_profile` RPC Function**
   - **Checks subscription plan limits** before creating
   - **Creates a NEW business** (never updates existing)
   - **Returns ONLY the newly created business** using `RETURNING id INTO` then selecting by ID
   - **Never uses SELECT INTO** that could return multiple rows
   - Enforces `max_businesses` from subscription plan (-1 = unlimited)

4. **Create `update_business_profile` RPC Function**
   - Updates a specific business by ID
   - Verifies ownership before updating
   - Returns ONLY the updated business

### Client-Level Fixes (`contexts/BusinessContext.tsx`)

1. **Fixed `loadData` Function**
   - Changed from `.single()` to `.order('created_at', { ascending: false })`
   - Handles multiple businesses by using the most recent one
   - No more "query returned more than one row" errors

2. **Fixed `saveBusiness` Function**
   - Removed UPSERT logic (which assumed one business)
   - Uses `create_business_profile` RPC function
   - Single path (no cascading fallbacks)
   - Better error logging (not [object Object])
   - Checks plan limits automatically via RPC

3. **Better Error Handling**
   - Extracts error messages properly
   - Logs full error objects for debugging
   - Provides user-friendly error messages

## How to Apply the Fix

### Step 1: Run the SQL Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Select **"No limit"** in the dropdown
3. Copy and paste the entire contents of `database/fix_multi_business_support.sql`
4. Click **"Run"**
5. Verify the output shows:
   - ✅ Unique constraint removed
   - ✅ Old triggers/functions dropped
   - ✅ New RPC functions created

### Step 2: Verify the Fix

The SQL script includes verification queries. Check that:
- No unique constraint exists on `user_id`
- `create_business_profile` function exists
- `update_business_profile` function exists
- Users can have multiple businesses

### Step 3: Test

1. Try creating a business profile - should work
2. Try creating another business for the same user - should work (if plan allows)
3. Try creating more businesses than plan allows - should show limit error
4. Check console - should see proper error messages (not [object Object])

## Technical Details

### Why This Approach Works

**Before (Incorrect):**
```sql
-- UNIQUE constraint prevents multiple businesses
ALTER TABLE business_profiles ADD CONSTRAINT ... UNIQUE (user_id);

-- UPSERT assumes one business per user
INSERT ... ON CONFLICT (user_id) DO UPDATE ...
```

**After (Correct):**
```sql
-- No unique constraint - multiple businesses allowed
-- RPC function checks plan limits
CREATE FUNCTION create_business_profile(...) AS $$
  -- Check plan limits
  -- Count existing businesses
  -- Create NEW business
  -- Return ONLY the new business by ID
$$;
```

### Plan Limit Enforcement

The `create_business_profile` RPC function:
1. Gets user's subscription plan
2. Reads `max_businesses` from plan (-1 = unlimited)
3. Counts existing businesses for user
4. Compares count to limit
5. Creates business only if under limit
6. Returns clear error if limit reached

### Error Prevention

**What Prevents Future Errors:**

1. **No UNIQUE Constraint**: Multiple businesses allowed
2. **RPC Returns by ID**: Always returns exactly one row (the newly created business)
3. **No SELECT INTO on Multi-Row Queries**: All queries use specific IDs or LIMIT 1
4. **Single Path Logic**: No cascading fallbacks that can fail
5. **Better Error Logging**: Proper error extraction and logging

## Summary

✅ **Database**: Removed UNIQUE constraint  
✅ **Database**: Created `create_business_profile` RPC with plan limit checking  
✅ **Database**: Created `update_business_profile` RPC for updates  
✅ **Client**: Fixed `loadData` to handle multiple businesses  
✅ **Client**: Fixed `saveBusiness` to use create RPC (not upsert)  
✅ **Client**: Better error logging and handling  

This solution correctly supports multiple businesses per user while preventing "query returned more than one row" errors.

