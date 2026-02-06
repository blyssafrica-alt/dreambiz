# Fix Payment Proof Images Not Loading

## Problem
Payment proof images upload successfully but fail to display. Console shows:
- `[Ad Proof Upload] Upload successful` ✅
- `[Ad Proof] Load error: Failed to load resource` ❌

## Root Cause
The `ad_payment_proofs` bucket is **not public** or **RLS policies are missing/incorrect**.

## Solution (3 Steps)

### Step 1: Run SQL Script in Supabase

1. Go to **Supabase Dashboard > SQL Editor**
2. Open and run: `database/fix_ad_payment_proofs_public_access.sql`
3. This will:
   - Set bucket to public
   - Create/update RLS policies for public read access
   - Verify configuration

### Step 2: Verify in Dashboard

1. Go to **Storage > ad_payment_proofs**
2. Click **Settings** (gear icon) in the top right
3. Check **"Public bucket"** is enabled
4. Click **Save** if you made changes

### Step 3: Verify RLS Policies

Run this query in SQL Editor to check policies:

```sql
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%ad_payment_proofs%'
ORDER BY policyname;
```

You should see a policy named **"Public Read - ad_payment_proofs"** with `operation = 'SELECT'`.

## Test After Fix

1. Upload a new payment proof image
2. Check console logs - you should see:
   - `[Ad Proof Upload] Upload successful`
   - `[Ad Proof Upload] Verification response: { status: 200, ok: true }`
   - `[Ad Proof] Loaded successfully`
3. Image should display immediately

## If Still Not Working

### Check File Exists
Run this query to verify the file exists:

```sql
SELECT 
  name,
  bucket_id,
  created_at,
  (metadata->>'size')::bigint as size_bytes
FROM storage.objects
WHERE bucket_id = 'ad_payment_proofs'
  AND name LIKE '%ad-payment-proof%'
ORDER BY created_at DESC
LIMIT 5;
```

### Test URL Directly
Open the URL in a browser:
```
https://oqcgerfjjiozltkmmkxf.supabase.co/storage/v1/object/public/ad_payment_proofs/ad-payment-proof-1770395445699.png
```

- **If it loads**: Issue is in app code
- **If it doesn't**: Bucket is not public or RLS policies are wrong

### Check Bucket Public Status
```sql
SELECT name, public, file_size_limit
FROM storage.buckets
WHERE name = 'ad_payment_proofs';
```

Should show `public = true`.

## Common Issues

1. **Bucket not public**: Run Step 1 SQL script
2. **RLS policy missing**: Run Step 1 SQL script  
3. **Policy syntax error**: Check console for SQL errors
4. **CORS issues**: Usually not the problem for public buckets
5. **File doesn't exist**: Check Step "Check File Exists" above

## Quick Fix Command

Run this single SQL command to fix everything:

```sql
-- Make bucket public
UPDATE storage.buckets SET public = true WHERE name = 'ad_payment_proofs';

-- Ensure public read policy exists
DROP POLICY IF EXISTS "Public Read - ad_payment_proofs" ON storage.objects;
CREATE POLICY "Public Read - ad_payment_proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad_payment_proofs');
```

Then verify:
```sql
SELECT name, public FROM storage.buckets WHERE name = 'ad_payment_proofs';
SELECT policyname FROM pg_policies WHERE policyname = 'Public Read - ad_payment_proofs';
```

