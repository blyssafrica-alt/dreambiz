-- ============================================
-- COMMERCE STORAGE BUCKETS + POLICIES
-- Run in Supabase SQL Editor after creating buckets in Dashboard (see comments).
-- Buckets: product-files, course-materials, lesson-videos, lesson-attachments, event-tickets
-- All PRIVATE (paid content). product_images remains PUBLIC.
-- ============================================

-- ============================================
-- STEP 1: Create buckets in Dashboard (Storage > New bucket)
-- ============================================
-- 1. product-files    PRIVATE, 50 MB, MIME: pdf, doc, docx, pptx, xlsx, zip, png, jpg, jpeg, webp, mp4
-- 2. course-materials  PRIVATE, 50 MB, same MIME
-- 3. lesson-videos     PRIVATE, 500 MB, video/*
-- 4. lesson-attachments PRIVATE, 50 MB, same as product-files
-- 5. event-tickets     PRIVATE, 10 MB, application/pdf, image/*
--
-- Use bucket name exactly: product-files, course-materials, lesson-videos, lesson-attachments, event-tickets

-- ============================================
-- POLICIES: Private buckets – no public read; upload/update/delete for authenticated; select only via RLS
-- ============================================

-- PRODUCT-FILES
DROP POLICY IF EXISTS "Authenticated Upload - product-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - product-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - product-files" ON storage.objects;
DROP POLICY IF EXISTS "Super admin read product-files" ON storage.objects;

CREATE POLICY "Authenticated Upload - product-files"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'product-files' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Update - product-files"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'product-files' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Delete - product-files"
ON storage.objects FOR DELETE USING (
  bucket_id = 'product-files' AND auth.role() = 'authenticated'
);
-- No SELECT policy: private bucket. Use service role in Edge Function or backend to createSignedUrl after verifying user_access.

-- COURSE-MATERIALS
DROP POLICY IF EXISTS "Authenticated Upload - course-materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - course-materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - course-materials" ON storage.objects;

CREATE POLICY "Authenticated Upload - course-materials"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Update - course-materials"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'course-materials' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Delete - course-materials"
ON storage.objects FOR DELETE USING (
  bucket_id = 'course-materials' AND auth.role() = 'authenticated'
);

-- LESSON-VIDEOS
DROP POLICY IF EXISTS "Authenticated Upload - lesson-videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - lesson-videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - lesson-videos" ON storage.objects;

CREATE POLICY "Authenticated Upload - lesson-videos"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lesson-videos' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Update - lesson-videos"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'lesson-videos' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Delete - lesson-videos"
ON storage.objects FOR DELETE USING (
  bucket_id = 'lesson-videos' AND auth.role() = 'authenticated'
);

-- LESSON-ATTACHMENTS
DROP POLICY IF EXISTS "Authenticated Upload - lesson-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - lesson-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - lesson-attachments" ON storage.objects;

CREATE POLICY "Authenticated Upload - lesson-attachments"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lesson-attachments' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Update - lesson-attachments"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'lesson-attachments' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Delete - lesson-attachments"
ON storage.objects FOR DELETE USING (
  bucket_id = 'lesson-attachments' AND auth.role() = 'authenticated'
);

-- EVENT-TICKETS
DROP POLICY IF EXISTS "Authenticated Upload - event-tickets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update - event-tickets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete - event-tickets" ON storage.objects;

CREATE POLICY "Authenticated Upload - event-tickets"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'event-tickets' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Update - event-tickets"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'event-tickets' AND auth.role() = 'authenticated'
);
CREATE POLICY "Authenticated Delete - event-tickets"
ON storage.objects FOR DELETE USING (
  bucket_id = 'event-tickets' AND auth.role() = 'authenticated'
);

-- ============================================
-- NOTE: Signed URLs for private buckets must be created in app with supabase.storage.from(bucket).createSignedUrl(path, expiresIn).
-- Restrict creation to after verifying user has user_access for that product (digital/course/event).
-- ============================================
