# Quick Fix: Support Multiple Businesses Per User

## Critical Issue Fixed

The system was incorrectly preventing users from creating multiple business profiles, even though the design allows it based on subscription plans.

## Immediate Action Required

### 1. Run This SQL Script in Supabase

**File**: `database/fix_multi_business_support.sql`

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Select **"No limit"** in the dropdown
3. Copy entire file content
4. Paste and click **"Run"**

### 2. What This Fixes

✅ Removes incorrect UNIQUE constraint on `user_id`  
✅ Creates `create_business_profile` RPC function (supports multiple businesses)  
✅ Creates `update_business_profile` RPC function  
✅ Enforces subscription plan limits (`max_businesses`)  
✅ Prevents "query returned more than one row" errors  
✅ Fixes 400 Bad Request errors (RPC function not found)  

### 3. Client Code Already Updated

The `contexts/BusinessContext.tsx` file has been updated to:
- Handle multiple businesses in `loadData` (uses most recent)
- Use `create_business_profile` RPC (not UPSERT)
- Better error logging (not [object Object])
- Handle 400 errors with helpful messages

### 4. Test

After running the SQL script:
1. Try creating a business profile - should work
2. Try creating another business - should work (if plan allows)
3. Check console - should see proper error messages

## If You See 400 Error

The 400 error means the RPC function doesn't exist yet. Run the SQL script above to create it.

## If You See "query returned more than one row"

This should be fixed after running the SQL script. The new RPC function always returns exactly one row (the newly created business).

