-- Ensure ad analytics counts update on clicks/conversions (updates)
CREATE OR REPLACE FUNCTION update_ad_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE advertisements
    SET impressions_count = impressions_count + 1
    WHERE id = NEW.ad_id;

    IF NEW.clicked = true THEN
      UPDATE advertisements
      SET clicks_count = clicks_count + 1
      WHERE id = NEW.ad_id;
    END IF;

    IF NEW.converted = true THEN
      UPDATE advertisements
      SET conversions_count = conversions_count + 1
      WHERE id = NEW.ad_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.clicked = true AND (OLD.clicked IS DISTINCT FROM NEW.clicked) THEN
      UPDATE advertisements
      SET clicks_count = clicks_count + 1
      WHERE id = NEW.ad_id;
    END IF;

    IF NEW.converted = true AND (OLD.converted IS DISTINCT FROM NEW.converted) THEN
      UPDATE advertisements
      SET conversions_count = conversions_count + 1
      WHERE id = NEW.ad_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

