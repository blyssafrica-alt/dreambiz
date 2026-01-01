# Fix for "query returned more than one row" 500 Error

## Root Cause Analysis

### The Problem
When users try to create a business profile, they encounter a **500 server error** with the message:
```
query returned more than one row
```

### Why This Happens

1. **No Unique Constraint**: The `business_profiles` table didn't have a unique constraint on `user_id`, allowing duplicate profiles to be created for the same user.

2. **`.single()` Call Fails**: The client code uses `.single()` which expects exactly one row. When duplicates exist, PostgreSQL returns multiple rows, causing `.single()` to throw "query returned more than one row".

3. **SELECT INTO Without LIMIT**: Some RPC functions or triggers use `SELECT ... INTO` without `LIMIT 1`, which fails when multiple rows match.

4. **Race Conditions**: Multiple simultaneous requests could create duplicates before constraints are enforced.

## The Solution

### Database-Level Fixes (Run `database/fix_business_profiles_500_error.sql`)

1. **Clean Up Existing Duplicates**
   - Removes all duplicate business profiles, keeping only the most recent one per user
   - Uses `ROW_NUMBER()` to safely identify duplicates

2. **Create Unique Constraint**
   ```sql
   ALTER TABLE public.business_profiles 
     ADD CONSTRAINT business_profiles_user_id_unique UNIQUE (user_id);
   ```
   - **Prevents duplicates at the database level**
   - PostgreSQL will reject any INSERT that would create a duplicate

3. **Create Safety Trigger**
   - A trigger function that cleans up any duplicates (as a safety net)
   - Fires AFTER INSERT or UPDATE

4. **Create RPC Function with Native UPSERT**
   - Uses PostgreSQL's `ON CONFLICT DO UPDATE` (UPSERT)
   - Atomically handles INSERT or UPDATE in a single operation
   - Never returns multiple rows

### Client-Level Fixes (`contexts/BusinessContext.tsx`)

1. **Replaced Manual UPDATE/INSERT with `.upsert()`**
   - Uses Supabase's `.upsert()` method which leverages PostgreSQL's `ON CONFLICT`
   - Uses `onConflict: 'user_id'` to handle duplicates automatically
   - Uses `.maybeSingle()` instead of `.single()` for graceful error handling

2. **RPC Function Fallback**
   - If client UPSERT fails, falls back to the `upsert_business_profile` RPC function
   - RPC function uses native PostgreSQL UPSERT, ensuring atomicity

3. **Better Error Messages**
   - Provides clear, actionable error messages
   - Guides users to run SQL scripts if needed

## How to Apply the Fix

### Step 1: Run the SQL Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Select **"No limit"** in the dropdown (important!)
3. Copy and paste the entire contents of `database/fix_business_profiles_500_error.sql`
4. Click **"Run"**
5. Verify the output shows:
   - ✅ Unique constraint created
   - ✅ Trigger created
   - ✅ RPC function created
   - ✅ No duplicates found (or duplicates cleaned up)

### Step 2: Verify the Fix

The SQL script includes verification queries at the end. Check that:
- Unique constraint exists: `business_profiles_user_id_unique`
- Trigger exists: `cleanup_duplicates_on_business_profile`
- RPC function exists: `upsert_business_profile`
- No duplicates remain

### Step 3: Test

1. Try creating a business profile in the app
2. It should work without errors
3. Try creating another profile for the same user - it should update the existing one instead of creating a duplicate

## Technical Details

### Why UPSERT is Better

**Before (Manual UPDATE/INSERT):**
```typescript
// Check if exists
const existing = await supabase.from('business_profiles').select().eq('user_id', userId).maybeSingle();

if (existing) {
  // UPDATE
  await supabase.from('business_profiles').update(...).eq('id', existing.id).single();
} else {
  // INSERT
  await supabase.from('business_profiles').insert(...).single();
}
```
**Problems:**
- Race condition: Another request could insert between check and insert
- `.single()` fails if duplicates exist
- Two separate database round trips

**After (Native UPSERT):**
```typescript
// Single atomic operation
await supabase.from('business_profiles').upsert({
  user_id: userId,
  ...
}, {
  onConflict: 'user_id',
  ignoreDuplicates: false
}).maybeSingle();
```
**Benefits:**
- Atomic: Either INSERT or UPDATE, never both
- Single database round trip
- Handles duplicates automatically
- `.maybeSingle()` gracefully handles edge cases

### Database Constraint Enforcement

The unique constraint ensures:
- **At the database level**: PostgreSQL will reject any INSERT that violates uniqueness
- **Before triggers fire**: Constraints are checked before triggers execute
- **Atomic**: No race conditions possible

## Error Prevention

### What Prevents Future Errors

1. **Unique Constraint**: Database-level enforcement prevents duplicates
2. **UPSERT Logic**: Client code uses atomic operations
3. **Safety Trigger**: Cleans up any edge cases
4. **RPC Fallback**: Provides an alternative if client UPSERT fails

### What to Do If Error Persists

If you still see "query returned more than one row":

1. **Check for duplicates:**
   ```sql
   SELECT user_id, COUNT(*) as count
   FROM public.business_profiles
   GROUP BY user_id
   HAVING COUNT(*) > 1;
   ```

2. **If duplicates exist, run cleanup:**
   ```sql
   -- From fix_business_profiles_500_error.sql, Step 1
   WITH ranked_profiles AS (
     SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
     FROM public.business_profiles
   )
   DELETE FROM public.business_profiles
   WHERE id IN (SELECT id FROM ranked_profiles WHERE rn > 1);
   ```

3. **Verify unique constraint exists:**
   ```sql
   SELECT conname FROM pg_constraint
   WHERE conrelid = 'public.business_profiles'::regclass
     AND conname = 'business_profiles_user_id_unique';
   ```

## Summary

✅ **Database**: Unique constraint prevents duplicates  
✅ **Database**: Trigger cleans up edge cases  
✅ **Database**: RPC function uses native UPSERT  
✅ **Client**: Uses `.upsert()` with `onConflict`  
✅ **Client**: Falls back to RPC if needed  
✅ **Client**: Better error handling and messages  

This solution is **production-safe** and handles all edge cases.

