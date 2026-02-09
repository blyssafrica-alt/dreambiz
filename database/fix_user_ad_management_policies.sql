-- Fix RLS policies to allow users to pause, resume, and delete their own ads
-- Users should be able to manage their own ads regardless of status

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can update their own pending ads" ON advertisements;
DROP POLICY IF EXISTS "Users can update their own ads" ON advertisements;
DROP POLICY IF EXISTS "Users can delete their own ads" ON advertisements;

-- Create new policy that allows users to update their own ads (pause, resume, edit)
CREATE POLICY "Users can update their own ads" ON advertisements
  FOR UPDATE
  USING (auth.uid()::text = created_by::text)
  WITH CHECK (auth.uid()::text = created_by::text);

-- Create policy to allow users to delete their own ads
DROP POLICY IF EXISTS "Users can delete their own ads" ON advertisements;
CREATE POLICY "Users can delete their own ads" ON advertisements
  FOR DELETE
  USING (auth.uid()::text = created_by::text);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'advertisements'
ORDER BY policyname;
