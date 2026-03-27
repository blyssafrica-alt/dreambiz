# SQL Setup Instructions - Step by Step

## Important Notes
- Make sure you copy the **ENTIRE** file contents
- Don't copy partial lines or add extra characters
- Run each SQL file separately (don't combine them)

## Step 1: Set Up RLS Policies

1. Open Supabase Dashboard → SQL Editor → New Query
2. **Change dropdown to "No limit"** (CRITICAL!)
3. Open `database/fix_business_profiles_rls.sql`
4. **Select ALL** (Ctrl+A or Cmd+A)
5. **Copy** (Ctrl+C or Cmd+C)
6. **Paste** into SQL Editor (Ctrl+V or Cmd+V)
7. Click **Run** (or press Ctrl+Enter)
8. Wait for "Success" message ✅

## Step 2: Set Up RPC Function

1. In the same SQL Editor, click **New Query** (or clear the previous one)
2. **Change dropdown to "No limit"** again
3. Open `database/create_business_profile_rpc.sql`
4. **Select ALL** (Ctrl+A or Cmd+A)
5. **Copy** (Ctrl+C or Cmd+C)
6. **Paste** into SQL Editor (Ctrl+V or Cmd+V)
7. Click **Run** (or press Ctrl+Enter)
8. Wait for "Success" message ✅

## Common Errors and Fixes

### Error: "syntax error at or near 'dr'"
**Cause:** You might have copied only part of the file or there's a hidden character.

**Fix:**
1. Make sure you select **ALL** text in the file (Ctrl+A)
2. Copy it completely
3. In SQL Editor, clear everything first
4. Paste the complete file
5. Make sure there are no extra characters at the beginning or end

### Error: "function already exists"
**Cause:** The function was already created.

**Fix:** This is okay! The `CREATE OR REPLACE` will update it. Just run it again.

### Error: "permission denied"
**Cause:** SQL Editor dropdown is not set to "No limit".

**Fix:** Change the dropdown from "RLS disabled" to **"No limit"** and try again.

## Verification

After running both SQL files, verify they worked:

### Check RLS Policies:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'business_profiles';
```
Should return 4 rows.

### Check RPC Function:
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'create_or_update_business_profile';
```
Should return 1 row with `prosecdef = true`.

## After Setup

1. Refresh your app
2. Try onboarding again
3. The errors should be gone!

