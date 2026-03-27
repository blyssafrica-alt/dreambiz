-- Diagnostic queries to check why clicks/conversions/spend aren't updating

-- 1. Check if trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'update_ad_analytics_trigger';

-- 2. Check ads and their billing settings
SELECT 
  id,
  title,
  billing_type,
  billing_rate,
  clicks_count,
  conversions_count,
  impressions_count,
  spend_actual
FROM advertisements
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check recent impressions and their clicked/converted status
SELECT 
  ai.id,
  ai.ad_id,
  ai.clicked,
  ai.converted,
  ai.viewed_at,
  ai.clicked_at,
  ai.converted_at,
  a.title,
  a.billing_type,
  a.billing_rate
FROM ad_impressions ai
LEFT JOIN advertisements a ON ai.ad_id = a.id
ORDER BY ai.viewed_at DESC
LIMIT 20;

-- 4. Count clicks vs impressions
SELECT 
  a.id,
  a.title,
  COUNT(ai.id) as total_impressions,
  COUNT(CASE WHEN ai.clicked = true THEN 1 END) as total_clicks,
  COUNT(CASE WHEN ai.converted = true THEN 1 END) as total_conversions,
  a.clicks_count as stored_clicks_count,
  a.conversions_count as stored_conversions_count,
  a.spend_actual as stored_spend
FROM advertisements a
LEFT JOIN ad_impressions ai ON a.id = ai.ad_id
GROUP BY a.id, a.title, a.clicks_count, a.conversions_count, a.spend_actual
ORDER BY total_impressions DESC
LIMIT 10;

-- 5. Check if any ads are missing billing rates
SELECT 
  id,
  title,
  billing_type,
  billing_rate,
  CASE 
    WHEN billing_type IS NULL THEN 'Missing billing type'
    WHEN billing_rate IS NULL OR billing_rate = 0 THEN 'Missing or zero billing rate'
    ELSE 'OK'
  END as status
FROM advertisements
WHERE status IN ('active', 'pending')
ORDER BY created_at DESC;

