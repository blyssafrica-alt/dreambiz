-- Test script to verify click tracking is working

-- 1. Check if trigger exists and is enabled
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'update_ad_analytics_trigger';

-- 2. Check the most recent ad impression
SELECT 
  ai.*,
  a.title as ad_title,
  a.billing_type,
  a.billing_rate,
  a.clicks_count,
  a.spend_actual
FROM ad_impressions ai
LEFT JOIN advertisements a ON ai.ad_id = a.id
ORDER BY ai.viewed_at DESC
LIMIT 5;

-- 3. Manually test the trigger by updating an impression
-- First, find an impression that hasn't been clicked
SELECT 
  ai.id,
  ai.ad_id,
  ai.clicked,
  a.title,
  a.billing_type,
  a.billing_rate,
  a.clicks_count,
  a.spend_actual
FROM ad_impressions ai
LEFT JOIN advertisements a ON ai.ad_id = a.id
WHERE ai.clicked = false
ORDER BY ai.viewed_at DESC
LIMIT 1;

-- 4. Check if ads have billing rates
SELECT 
  id,
  title,
  billing_type,
  billing_rate,
  clicks_count,
  spend_actual,
  CASE 
    WHEN billing_type IS NULL THEN '❌ Missing billing_type'
    WHEN billing_rate IS NULL OR billing_rate = 0 THEN '❌ Missing or zero billing_rate'
    ELSE '✅ OK'
  END as status
FROM advertisements
WHERE status = 'active'
ORDER BY created_at DESC;

-- 5. Check billing defaults
SELECT * FROM ad_billing_settings ORDER BY billing_type;

-- 6. Count actual clicks vs stored clicks
SELECT 
  a.id,
  a.title,
  COUNT(ai.id) as total_impressions,
  COUNT(CASE WHEN ai.clicked = true THEN 1 END) as actual_clicks_in_db,
  a.clicks_count as stored_clicks_count,
  CASE 
    WHEN COUNT(CASE WHEN ai.clicked = true THEN 1 END) != a.clicks_count THEN '⚠️ MISMATCH'
    ELSE '✅ Match'
  END as click_count_status,
  a.billing_type,
  a.billing_rate,
  a.spend_actual
FROM advertisements a
LEFT JOIN ad_impressions ai ON a.id = ai.ad_id
WHERE a.status = 'active'
GROUP BY a.id, a.title, a.clicks_count, a.billing_type, a.billing_rate, a.spend_actual
ORDER BY total_impressions DESC;

