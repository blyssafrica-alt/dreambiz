-- Quick fix: Recalculate clicks, conversions, and spend from impressions
-- This will fix any discrepancies between actual impressions and stored counts

-- 1. First, ensure the trigger function has SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_ad_analytics()
RETURNS TRIGGER AS $$
DECLARE
  ad_billing_type TEXT;
  ad_billing_rate DECIMAL(15, 4);
  default_billing_rate DECIMAL(15, 4);
  cost_to_add DECIMAL(15, 4) DEFAULT 0;
BEGIN
  -- Get ad billing info
  SELECT billing_type, billing_rate INTO ad_billing_type, ad_billing_rate
  FROM advertisements
  WHERE id = NEW.ad_id;

  -- Default billing type if missing
  IF ad_billing_type IS NULL THEN
    ad_billing_type := 'cpc';
    -- Update the ad with default billing type
    UPDATE advertisements
    SET billing_type = ad_billing_type
    WHERE id = NEW.ad_id AND billing_type IS NULL;
  END IF;

  -- If billing_rate is NULL, try to get default from ad_billing_settings for this specific billing type
  IF ad_billing_rate IS NULL OR ad_billing_rate = 0 THEN
    SELECT billing_rate INTO default_billing_rate
    FROM ad_billing_settings
    WHERE billing_type = ad_billing_type
    LIMIT 1;
    
    IF default_billing_rate IS NOT NULL AND default_billing_rate > 0 THEN
      ad_billing_rate := default_billing_rate;
      -- Also update the ad with the default rate for future use
      UPDATE advertisements
      SET billing_rate = default_billing_rate
      WHERE id = NEW.ad_id AND (billing_rate IS NULL OR billing_rate = 0);
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    cost_to_add = CASE
      WHEN ad_billing_type = 'cpc' AND NEW.clicked = true THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpa' AND NEW.converted = true THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpe' AND (NEW.clicked = true OR NEW.converted = true) THEN COALESCE(ad_billing_rate, 0)
      ELSE 0
    END;

    UPDATE advertisements 
    SET
      impressions_count = COALESCE(impressions_count, 0) + 1,
      clicks_count = COALESCE(clicks_count, 0) + CASE WHEN NEW.clicked = true THEN 1 ELSE 0 END,
      conversions_count = COALESCE(conversions_count, 0) + CASE WHEN NEW.converted = true THEN 1 ELSE 0 END,
      revenue = COALESCE(revenue, 0) + CASE WHEN NEW.converted = true THEN COALESCE(NEW.conversion_value, 0) ELSE 0 END,
      spend_actual = COALESCE(spend_actual, 0) + cost_to_add
    WHERE id = NEW.ad_id;

    -- Update ad set spend if ad_set_id exists
    IF EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL) THEN
      UPDATE ad_sets
      SET
        spend_actual = COALESCE(spend_actual, 0) + cost_to_add
      WHERE id = (SELECT ad_set_id FROM advertisements WHERE id = NEW.ad_id);
    END IF;

    -- Update daily spend for ad set
    IF cost_to_add > 0 AND EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL) THEN
      INSERT INTO ad_set_daily_spend (ad_set_id, spend_date, spend_amount)
      SELECT ad_set_id, (NEW.viewed_at::date), cost_to_add
      FROM advertisements
      WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL
      ON CONFLICT (ad_set_id, spend_date)
      DO UPDATE SET
        spend_amount = COALESCE(ad_set_daily_spend.spend_amount, 0) + EXCLUDED.spend_amount,
        updated_at = NOW();
    END IF;

    -- Update campaign spend if campaign_id exists
    IF EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND campaign_id IS NOT NULL) THEN
      UPDATE ad_campaigns
      SET
        spend_actual = COALESCE(spend_actual, 0) + cost_to_add
      WHERE id = (SELECT campaign_id FROM advertisements WHERE id = NEW.ad_id);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    cost_to_add = CASE
      WHEN ad_billing_type = 'cpc' AND NEW.clicked = true AND (OLD.clicked IS DISTINCT FROM NEW.clicked) THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpa' AND NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpe' AND NEW.clicked = true AND (OLD.clicked IS DISTINCT FROM NEW.clicked) THEN COALESCE(ad_billing_rate, 0)
      WHEN ad_billing_type = 'cpe' AND NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) AND COALESCE(OLD.clicked, false) = false THEN COALESCE(ad_billing_rate, 0)
      ELSE 0
    END;

    UPDATE advertisements
    SET
      clicks_count = COALESCE(clicks_count, 0) + CASE WHEN NEW.clicked = true AND (OLD.clicked IS DISTINCT FROM NEW.clicked) THEN 1 ELSE 0 END,
      conversions_count = COALESCE(conversions_count, 0) + CASE WHEN NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) THEN 1 ELSE 0 END,
      revenue = COALESCE(revenue, 0) + CASE
        WHEN NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) THEN COALESCE(NEW.conversion_value, 0)
        ELSE 0
      END,
      spend_actual = COALESCE(spend_actual, 0) + cost_to_add
    WHERE id = NEW.ad_id;

    -- Update ad set spend if ad_set_id exists
    IF cost_to_add > 0 AND EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL) THEN
      UPDATE ad_sets
      SET
        spend_actual = COALESCE(spend_actual, 0) + cost_to_add
      WHERE id = (SELECT ad_set_id FROM advertisements WHERE id = NEW.ad_id);

      -- Update daily spend
      INSERT INTO ad_set_daily_spend (ad_set_id, spend_date, spend_amount)
      SELECT ad_set_id, (NEW.viewed_at::date), cost_to_add
      FROM advertisements
      WHERE id = NEW.ad_id AND ad_set_id IS NOT NULL
      ON CONFLICT (ad_set_id, spend_date)
      DO UPDATE SET
        spend_amount = COALESCE(ad_set_daily_spend.spend_amount, 0) + EXCLUDED.spend_amount,
        updated_at = NOW();
    END IF;

    -- Update campaign spend if campaign_id exists
    IF cost_to_add > 0 AND EXISTS (SELECT 1 FROM advertisements WHERE id = NEW.ad_id AND campaign_id IS NOT NULL) THEN
      UPDATE ad_campaigns
      SET
        spend_actual = COALESCE(spend_actual, 0) + cost_to_add
      WHERE id = (SELECT campaign_id FROM advertisements WHERE id = NEW.ad_id);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in update_ad_analytics trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Recreate the trigger
DROP TRIGGER IF EXISTS update_ad_analytics_trigger ON ad_impressions;
CREATE TRIGGER update_ad_analytics_trigger 
  AFTER INSERT OR UPDATE ON ad_impressions
  FOR EACH ROW 
  EXECUTE FUNCTION update_ad_analytics();

-- 3. Fix existing ads that might have NULL billing rates
UPDATE advertisements
SET billing_type = COALESCE(billing_type, 'cpc')
WHERE billing_type IS NULL;

UPDATE advertisements a
SET billing_rate = COALESCE(
  NULLIF(a.billing_rate, 0),
  (SELECT billing_rate FROM ad_billing_settings WHERE billing_type = a.billing_type LIMIT 1),
  0
)
WHERE a.billing_rate IS NULL OR a.billing_rate = 0;

-- 4. Recalculate counts and spend from existing impressions
WITH impression_stats AS (
  SELECT 
    ad_id,
    COUNT(*) as total_impressions,
    COUNT(*) FILTER (WHERE clicked = true) as total_clicks,
    COUNT(*) FILTER (WHERE converted = true) as total_conversions,
    SUM(
      CASE 
        WHEN clicked = true AND EXISTS (
          SELECT 1 FROM advertisements a 
          WHERE a.id = ad_impressions.ad_id 
          AND a.billing_type = 'cpc'
        ) THEN COALESCE((SELECT billing_rate FROM advertisements WHERE id = ad_impressions.ad_id), 0)
        WHEN converted = true AND EXISTS (
          SELECT 1 FROM advertisements a 
          WHERE a.id = ad_impressions.ad_id 
          AND a.billing_type = 'cpa'
        ) THEN COALESCE((SELECT billing_rate FROM advertisements WHERE id = ad_impressions.ad_id), 0)
        WHEN (clicked = true OR converted = true) AND EXISTS (
          SELECT 1 FROM advertisements a 
          WHERE a.id = ad_impressions.ad_id 
          AND a.billing_type = 'cpe'
        ) THEN COALESCE((SELECT billing_rate FROM advertisements WHERE id = ad_impressions.ad_id), 0)
        ELSE 0
      END
    ) as calculated_spend
  FROM ad_impressions
  GROUP BY ad_id
)
UPDATE advertisements a
SET
  impressions_count = COALESCE(istats.total_impressions, 0),
  clicks_count = COALESCE(istats.total_clicks, 0),
  conversions_count = COALESCE(istats.total_conversions, 0),
  spend_actual = COALESCE(istats.calculated_spend, 0)
FROM impression_stats istats
WHERE a.id = istats.ad_id;

