-- Setup Supabase Storage Buckets for All Images and Documents
-- IMPORTANT: Storage buckets and policies must be created through Supabase Dashboard UI
-- This file provides instructions only - DO NOT run SQL commands for storage

-- ============================================
-- STEP 1: Create Storage Buckets (via Dashboard)
-- ============================================
-- Go to: Supabase Dashboard > Storage > New Bucket
-- Create these buckets with PUBLIC access:

-- 1. book_covers
--    - Name: book_covers
--    - Public bucket: YES
--    - File size limit: 5 MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp

-- 2. book-documents
--    - Name: book-documents
--    - Public bucket: YES
--    - File size limit: 50 MB
--    - Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- 3. ad_images
--    - Name: ad_images
--    - Public bucket: YES
--    - File size limit: 10 MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- 4. product_images
--    - Name: product_images
--    - Public bucket: YES
--    - File size limit: 10 MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp

-- 5. business_logos
--    - Name: business_logos
--    - Public bucket: YES
--    - File size limit: 2 MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================
-- STEP 2: Storage Policies (via Dashboard)
-- ============================================
-- For each bucket, go to: Storage > [Bucket Name] > Policies
-- Add these policies:

-- Policy 1: Public Read Access
--   Policy name: Public Read
--   Allowed operation: SELECT
--   Policy definition: (bucket_id = 'bucket_name')
--   This allows anyone to read/view files

-- Policy 2: Authenticated Upload
--   Policy name: Authenticated Upload
--   Allowed operation: INSERT
--   Policy definition: (bucket_id = 'bucket_name' AND auth.role() = 'authenticated')
--   This allows logged-in users to upload files

-- Policy 3: Authenticated Update (optional)
--   Policy name: Authenticated Update
--   Allowed operation: UPDATE
--   Policy definition: (bucket_id = 'bucket_name' AND auth.role() = 'authenticated')
--   This allows logged-in users to update files

-- Policy 4: Authenticated Delete (optional)
--   Policy name: Authenticated Delete
--   Allowed operation: DELETE
--   Policy definition: (bucket_id = 'bucket_name' AND auth.role() = 'authenticated')
--   This allows logged-in users to delete files

-- ============================================
-- ALTERNATIVE: Using Supabase CLI (if available)
-- ============================================
-- If you have Supabase CLI installed, you can create buckets via:
-- supabase storage create bucket-name --public

-- ============================================
-- VERIFICATION
-- ============================================
-- After creating buckets, verify they exist:
-- SELECT * FROM storage.buckets WHERE name IN ('book_covers', 'book-documents', 'ad_images', 'product_images', 'business_logos');

-- Note: Storage schema operations require superuser/admin access
-- Regular SQL users cannot modify storage schema directly

