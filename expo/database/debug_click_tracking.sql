-- Debug: Check if impressions exist and their click status
-- Replace the ad_id with your actual ad ID from the query results

-- 1. Check all impressions for this specific ad
SELECT 
  ai.id,
  ai.ad_id,
  ai.user_id,
  ai.business_id,
  ai.location,
  ai.session_id,
  ai.viewed_at,
  ai.clicked,
  ai.clicked_at,
  ai.converted,
  ai.converted_at,
  a.title as ad_title,
  a.billing_type,
  a.billing_rate
FROM ad_impressions ai
LEFT JOIN advertisements a ON ai.ad_id = a.id
WHERE ai.ad_id = '58792c26-ccf8-47c0-b79c-03f882636297'  -- Replace with your ad ID
ORDER BY ai.viewed_at DESC;

-- 2. Check if there are ANY impressions with clicked = true for this ad
SELECT 
  COUNT(*) as total_impressions,
  COUNT(*) FILTER (WHERE clicked = true) as clicked_count,
  COUNT(*) FILTER (WHERE clicked = false) as not_clicked_count,
  COUNT(*) FILTER (WHERE clicked IS NULL) as null_clicked_count
FROM ad_impressions
WHERE ad_id = '58792c26-ccf8-47c0-b79c-03f882636297';

-- 3. Check the most recent impressions across all ads to see if clicks are being tracked elsewhere
SELECT 
  ai.id,
  ai.ad_id,
  a.title,
  ai.viewed_at,
  ai.clicked,
  ai.clicked_at,
  ai.location,
  ai.session_id
FROM ad_impressions ai
LEFT JOIN advertisements a ON ai.ad_id = a.id
ORDER BY ai.viewed_at DESC
LIMIT 20;

-- 4. Check if there are any RLS policies blocking updates to ad_impressions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'ad_impressions';

-- 5. Check if the trigger is actually firing by looking at recent updates
-- (This requires enabling audit logging, but let's check trigger status)
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'update_ad_analytics_trigger';

