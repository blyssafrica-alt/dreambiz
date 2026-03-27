# Quick Fix: 500 Error "query returned more than one row"

## Immediate Action Required

### 1. Run This SQL Script in Supabase

**File**: `database/fix_business_profiles_500_error.sql`

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Select **"No limit"** in the dropdown
3. Copy entire file content
4. Paste and click **"Run"**

### 2. What This Fixes

✅ Cleans up existing duplicate business profiles  
✅ Creates unique constraint on `user_id` (prevents future duplicates)  
✅ Creates safety trigger for edge cases  
✅ Creates RPC function with native UPSERT  

### 3. Client Code Already Updated

The `contexts/BusinessContext.tsx` file has been updated to:
- Use `.upsert()` instead of manual UPDATE/INSERT
- Use `.maybeSingle()` instead of `.single()`
- Fall back to RPC function if needed

### 4. Test

After running the SQL script, try creating a business profile. It should work without errors.

## If Error Persists

Run this to check for duplicates:
```sql
SELECT user_id, COUNT(*) as count
FROM public.business_profiles
GROUP BY user_id
HAVING COUNT(*) > 1;
```

If duplicates exist, the SQL script will clean them up automatically.

