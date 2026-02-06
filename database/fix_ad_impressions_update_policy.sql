-- Fix: Add missing UPDATE policy for ad_impressions
-- This allows users to update their own impressions to track clicks and conversions

-- Add UPDATE policy for users to update their own impressions
DROP POLICY IF EXISTS "Users can update their own impressions" ON ad_impressions;
CREATE POLICY "Users can update their own impressions" ON ad_impressions
  FOR UPDATE 
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Add UPDATE policy for super admins to update any impression
DROP POLICY IF EXISTS "Super admins can update all impressions" ON ad_impressions;
CREATE POLICY "Super admins can update all impressions" ON ad_impressions
  FOR UPDATE 
  USING (is_super_admin());

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'ad_impressions'
ORDER BY policyname;

