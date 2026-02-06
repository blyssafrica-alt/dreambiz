# Troubleshooting Payment Proof Images Not Loading

## Problem
Payment proof images fail to load even after fixing duplicate bucket names in URLs.

## Root Causes

### 1. File Doesn't Exist in Storage
The file might not exist at either path:
- `ad_payment_proofs/ad-payment-proof-1770391637368.png` (correct)
- `ad_payment_proofs/ad_payment_proofs/ad-payment-proof-1770391637368.png` (old duplicate path)

### 2. Bucket Not Public
The `ad_payment_proofs` bucket must be set to **Public** in Supabase Dashboard.

### 3. Missing RLS Policies
The bucket needs proper Row Level Security (RLS) policies for public read access.

## Diagnostic Steps

### Step 1: Verify Bucket Configuration
1. Go to **Supabase Dashboard > Storage**
2. Check if `ad_payment_proofs` bucket exists
3. Click on the bucket
4. Verify:
   - ✅ **Public bucket**: Should be **YES**
   - ✅ **File size limit**: Should be at least 10 MB
   - ✅ **Allowed MIME types**: Should include `image/jpeg`, `image/png`, `image/webp`

### Step 2: Check Files in Storage
1. Go to **Storage > ad_payment_proofs**
2. Look for files matching the pattern `ad-payment-proof-*.png`
3. Check if files exist at:
   - Root level: `ad-payment-proof-1770391637368.png`
   - Or in subfolder: `ad_payment_proofs/ad-payment-proof-1770391637368.png`

### Step 3: Run SQL Diagnostic Script
Run `database/verify_ad_payment_proofs_bucket.sql` in Supabase SQL Editor to check:
- Bucket exists and is public
- RLS policies are configured
- Files exist in storage

### Step 4: Verify RLS Policies
Run this query in Supabase SQL Editor:
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%ad_payment_proofs%';
```

You should see a policy named **"Public Read - ad_payment_proofs"** with `cmd = 'SELECT'`.

## Solutions

### Solution 1: Re-upload the Payment Proof
If the file doesn't exist:
1. Go to the ad in the admin panel
2. Click "Edit" or "Resubmit"
3. Upload a new payment proof image
4. The new upload will use the correct path automatically

### Solution 2: Fix Bucket Configuration
If the bucket isn't public:
1. Go to **Storage > ad_payment_proofs**
2. Click **Settings** (gear icon)
3. Enable **Public bucket**
4. Save changes

### Solution 3: Create/Update RLS Policies
Run `database/create_ad_payment_proofs_bucket.sql` in Supabase SQL Editor to ensure policies are set up correctly.

### Solution 4: Move Files Manually (if they exist at wrong path)
If files exist at `ad_payment_proofs/ad_payment_proofs/filename.png`:
1. Go to **Storage > ad_payment_proofs**
2. Navigate to the `ad_payment_proofs` subfolder
3. Download the files
4. Upload them to the root of `ad_payment_proofs` bucket
5. Delete the old files from the subfolder

## Testing

After applying fixes:
1. Clear browser cache or restart the app
2. Try loading the payment proof image again
3. Check browser console for any new errors
4. Verify the URL in the console matches the file path in storage

## Expected Behavior

When working correctly:
- Image loads successfully
- Console shows: `[Payment Proof] Image loaded successfully`
- No error messages in console
- Image displays in the admin panel

## Still Not Working?

If images still don't load after following these steps:
1. Check browser console for CORS errors
2. Verify the Supabase project URL is correct
3. Check if there are any network errors in browser DevTools
4. Try accessing the URL directly in a browser to see the actual error

