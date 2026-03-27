# Storage Buckets Setup Guide

## Required Buckets

The application requires the following storage buckets to be created in Supabase:

### 1. **ad_payment_proofs** ⚠️ (NEW - Required for Ad Payment Proofs)
- **Purpose**: Store payment proof images uploaded by users when promoting ads
- **Public**: Yes (for public URL access)
- **File Size Limit**: 10 MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`

### 2. **payment_proofs**
- **Purpose**: Store payment proof images for subscriptions and other payments
- **Public**: Yes
- **File Size Limit**: 10 MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`

### 3. **book_covers**
- **Purpose**: Store book cover images
- **Public**: Yes
- **File Size Limit**: 5 MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`

### 4. **book-documents**
- **Purpose**: Store PDF documents for books
- **Public**: Yes (for reading)
- **File Size Limit**: 50 MB
- **Allowed MIME Types**: `application/pdf`

### 5. **ad_images**
- **Purpose**: Store ad banner and image assets
- **Public**: Yes
- **File Size Limit**: 5 MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

### 6. **product_images**
- **Purpose**: Store product images for the platform store
- **Public**: Yes
- **File Size Limit**: 5 MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`

### 7. **business_logos**
- **Purpose**: Store business logo images
- **Public**: Yes
- **File Size Limit**: 2 MB
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp`

## Setup Instructions

### Step 1: Create Buckets in Supabase Dashboard

1. Go to **Storage** in your Supabase project
2. Click **New Bucket**
3. For each bucket above:
   - Enter the bucket name exactly as shown
   - Set **Public bucket** to **Yes** (or configure RLS as needed)
   - Set appropriate file size limits
   - Configure allowed MIME types if your Supabase plan supports it

### Step 2: Run SQL Policies

After creating the buckets, run the SQL script to create policies:

**Option A: Run all policies at once**
```sql
-- Run: database/create_storage_policies.sql
```

**Option B: Run only ad_payment_proofs policies**
```sql
-- Run: database/create_ad_payment_proofs_bucket.sql
```

### Step 3: Verify Setup

Run this query to verify all buckets exist:

```sql
SELECT name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name IN (
  'book_covers', 
  'book-documents', 
  'ad_images', 
  'product_images', 
  'business_logos', 
  'payment_proofs',
  'ad_payment_proofs'
)
ORDER BY name;
```

Verify policies exist:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%ad_payment_proofs%'
ORDER BY policyname;
```

## Policy Details

### ad_payment_proofs Policies

1. **Public Read**: Anyone can view payment proof images via public URLs
2. **Authenticated Upload**: Logged-in users can upload payment proofs
3. **Authenticated Update**: Logged-in users can update their payment proofs
4. **Authenticated Delete**: Logged-in users can delete payment proofs
5. **Super Admin Full Access**: Super admins can manage all payment proofs

## Troubleshooting

### Error: "bucket not found"
- **Solution**: Create the bucket in Supabase Dashboard first, then run the SQL policies

### Error: "permission denied"
- **Solution**: Ensure RLS is enabled on the `storage.objects` table and policies are created

### Images not loading
- **Solution**: Ensure buckets are set to **Public** or policies allow public read access

### Upload fails
- **Solution**: Check file size limits and MIME type restrictions in bucket settings

## Security Notes

- **Public buckets**: Payment proofs are stored in public buckets for easy URL access. If you need more security:
  - Set buckets to private
  - Update policies to only allow authenticated users to read
  - Use signed URLs for temporary access

- **File validation**: The app validates file types and sizes before upload, but bucket-level restrictions provide additional security.

