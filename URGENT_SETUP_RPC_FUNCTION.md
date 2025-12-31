# URGENT: Set Up RPC Function to Fix RLS Error

## The Error You're Seeing
```
❌ RPC function also failed: [object Object]
Error code: 42501
new row violates row-level security policy for table "business_profiles"
```

## What This Means
The RPC function either:
1. **Doesn't exist yet** in your Supabase database (most likely)
2. **Exists but is failing** due to a parameter mismatch or other issue

## Quick Fix (3 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Set SQL Editor Mode
**CRITICAL:** Change the dropdown from "RLS disabled" to **"No limit"**

### Step 3: Run the RPC Function SQL
1. Open the file `database/create_business_profile_rpc.sql` in this project
2. Copy **ALL** the contents (all 124 lines)
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for "Success" message ✅

### Step 4: Verify Function Was Created
Run this query to check:

```sql
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  proargnames as argument_names
FROM pg_proc
WHERE proname = 'create_or_update_business_profile';
```

You should see **1 row** with:
- `function_name`: `create_or_update_business_profile`
- `security_definer`: `true` (this is important!)
- `argument_names`: Array of parameter names

### Step 5: Also Set Up RLS Policies (Recommended)
While you're in the SQL Editor, also run:

1. Open `database/fix_business_profiles_rls.sql`
2. Copy **ALL** contents
3. Paste into SQL Editor
4. Click **Run**

This sets up the RLS policies so the direct insert works (faster than RPC).

## How It Works

1. **First**: App tries direct insert (fast, uses RLS)
2. **If RLS blocks**: App automatically uses RPC function (slower, but bypasses RLS)
3. **RPC function**: Uses `SECURITY DEFINER` to bypass RLS and create the business profile

## After Setup

1. **Refresh your app**
2. **Try onboarding again**
3. **The error should be gone!**

The app will now:
- ✅ Try direct insert first (if RLS policies are set up)
- ✅ Automatically fall back to RPC if RLS blocks (always works)

## Troubleshooting

### Still Getting "RPC function not found"?
- Make sure you ran the SQL with "No limit" selected
- Check the function exists: `SELECT * FROM pg_proc WHERE proname = 'create_or_update_business_profile';`
- If it doesn't exist, run the SQL again

### RPC Function Exists But Still Failing?
Check the console logs - the improved error logging will now show:
- The exact error code
- The error message (not just [object Object])
- Error details and hints

This will help identify what's wrong.

## Why Both RLS Policies AND RPC Function?

- **RLS Policies**: Proper security, faster queries (preferred)
- **RPC Function**: Fallback that always works, even if RLS isn't perfect

Having both ensures the app works in all scenarios!

