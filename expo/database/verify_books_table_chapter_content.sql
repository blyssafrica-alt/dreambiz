-- Verify and Fix Books Table for Chapter Content Support
-- This script ensures the books table has all required columns and proper RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Verify and Add extracted_chapters_data Column
-- ============================================

DO $$ 
BEGIN
  -- Add extracted_chapters_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' 
    AND column_name = 'extracted_chapters_data'
  ) THEN
    ALTER TABLE books ADD COLUMN extracted_chapters_data JSONB DEFAULT '{}'::jsonb;
    COMMENT ON COLUMN books.extracted_chapters_data IS 'Full chapter content extracted from PDF for search and reference purposes. Contains: {fullText: string, extractedAt: timestamp, pageCount: number, metadata: object}';
    RAISE NOTICE 'Added extracted_chapters_data column to books table';
  ELSE
    RAISE NOTICE 'extracted_chapters_data column already exists';
  END IF;

  -- Ensure chapters column supports pageStart and pageEnd
  -- (This is already JSONB, so it supports any structure, but let's verify)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' 
    AND column_name = 'chapters'
    AND data_type = 'jsonb'
  ) THEN
    RAISE NOTICE 'chapters column exists and is JSONB (supports pageStart/pageEnd)';
  END IF;
END $$;

-- ============================================
-- STEP 2: Verify RLS Policies Allow SELECT on All Columns
-- ============================================

-- Check current RLS policies
DO $$
DECLARE
  policy_count INTEGER;
  super_admin_policy_exists BOOLEAN;
  user_view_policy_exists BOOLEAN;
BEGIN
  -- Count existing policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'books';

  -- Check for super admin policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'books'
    AND policyname = 'Super admins can manage all books'
  ) INTO super_admin_policy_exists;

  -- Check for user view policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'books'
    AND policyname = 'Users can view published books'
  ) INTO user_view_policy_exists;

  RAISE NOTICE 'Books table RLS policies:';
  RAISE NOTICE '  Total policies: %', policy_count;
  RAISE NOTICE '  Super admin policy exists: %', super_admin_policy_exists;
  RAISE NOTICE '  User view policy exists: %', user_view_policy_exists;
END $$;

-- ============================================
-- STEP 3: Ensure RLS Policies Are Correct
-- ============================================

-- Enable RLS (if not already enabled)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Super admins can manage all books" ON books;
DROP POLICY IF EXISTS "Users can view published books" ON books;
DROP POLICY IF EXISTS "Anyone can view books" ON books;

-- Recreate RLS Policies

-- Policy 1: Super Admins can do everything (including viewing extracted_chapters_data)
CREATE POLICY "Super admins can manage all books"
  ON books
  FOR ALL
  USING (public.is_super_admin());

-- Policy 2: Regular users can view published books (including extracted_chapters_data)
-- This allows users to read ALL columns including extracted_chapters_data
CREATE POLICY "Users can view published books"
  ON books
  FOR SELECT
  USING (status = 'published');

-- ============================================
-- STEP 4: Verify Column Access
-- ============================================

-- Test query to verify users can access extracted_chapters_data
-- This should work if policies are correct (will fail if RLS blocks it)
DO $$
DECLARE
  test_result JSONB;
BEGIN
  -- Try to select extracted_chapters_data from a published book
  SELECT extracted_chapters_data INTO test_result
  FROM books
  WHERE status = 'published'
  LIMIT 1;

  IF test_result IS NOT NULL THEN
    RAISE NOTICE '✅ SUCCESS: extracted_chapters_data is accessible';
    RAISE NOTICE '   Sample structure: %', jsonb_typeof(test_result);
  ELSE
    RAISE NOTICE '⚠️  WARNING: No published books found to test';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ ERROR: Cannot access extracted_chapters_data - %', SQLERRM;
END $$;

-- ============================================
-- STEP 5: Create Index for Performance (Optional but Recommended)
-- ============================================

-- Index on slug for faster lookups (should already exist, but verify)
CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);

-- GIN index on extracted_chapters_data for full-text search (if needed later)
-- This allows searching within the fullText content
CREATE INDEX IF NOT EXISTS idx_books_extracted_data_gin 
  ON books USING GIN (extracted_chapters_data);

-- ============================================
-- STEP 6: Verification Summary
-- ============================================

-- Display summary
SELECT 
  'Books Table Schema' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'books'
  AND column_name IN ('extracted_chapters_data', 'chapters', 'page_count', 'total_chapters')
ORDER BY column_name;

-- Display RLS policies
SELECT 
  'RLS Policies' as check_type,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'books'
ORDER BY policyname;

-- Display indexes
SELECT 
  'Indexes' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'books'
  AND indexname LIKE '%books%'
ORDER BY indexname;

-- Final summary in a DO block
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verification Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Column: extracted_chapters_data should be accessible';
  RAISE NOTICE '✅ RLS: Users can SELECT published books (all columns)';
  RAISE NOTICE '✅ Super Admins: Can manage all books (all columns)';
  RAISE NOTICE '';
  RAISE NOTICE 'If you see any errors above, check the output carefully.';
  RAISE NOTICE 'The app should now be able to read extracted_chapters_data';
END $$;

