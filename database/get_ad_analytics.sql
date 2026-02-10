-- Function to get detailed ad analytics with demographics
-- This allows ad owners to see who is interacting with their ads

CREATE OR REPLACE FUNCTION get_ad_analytics(ad_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'overview', (
      SELECT jsonb_build_object(
        'total_impressions', COUNT(*),
        'total_clicks', COUNT(*) FILTER (WHERE clicked = true),
        'total_conversions', COUNT(*) FILTER (WHERE converted = true),
        'unique_users', COUNT(DISTINCT user_id),
        'ctr', CASE 
          WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(*) FILTER (WHERE clicked = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
          ELSE 0 
        END,
        'cvr', CASE 
          WHEN COUNT(*) FILTER (WHERE clicked = true) > 0 THEN
            ROUND((COUNT(*) FILTER (WHERE converted = true)::DECIMAL / COUNT(*) FILTER (WHERE clicked = true)::DECIMAL) * 100, 2)
          ELSE 0
        END
      )
      FROM ad_impressions
      WHERE ad_id = ad_id_param
    ),
    'demographics', (
      SELECT jsonb_build_object(
        'age_groups', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'age_group', age_group,
              'count', count,
              'clicks', clicks,
              'conversions', conversions
            )
          )
          FROM (
            SELECT 
              CASE 
                WHEN age < 18 THEN 'Under 18'
                WHEN age BETWEEN 18 AND 24 THEN '18-24'
                WHEN age BETWEEN 25 AND 34 THEN '25-34'
                WHEN age BETWEEN 35 AND 44 THEN '35-44'
                WHEN age BETWEEN 45 AND 54 THEN '45-54'
                WHEN age >= 55 THEN '55+'
                ELSE 'Unknown'
              END as age_group,
              COUNT(*) as count,
              COUNT(*) FILTER (WHERE ai.clicked = true) as clicks,
              COUNT(*) FILTER (WHERE ai.converted = true) as conversions
            FROM ad_impressions ai
            LEFT JOIN users u ON ai.user_id = u.id
            LEFT JOIN LATERAL (
              SELECT EXTRACT(YEAR FROM AGE(u.birth_date))::INTEGER as age
            ) age_calc ON true
            WHERE ai.ad_id = ad_id_param
            GROUP BY age_group
            ORDER BY 
              CASE age_group
                WHEN 'Under 18' THEN 1
                WHEN '18-24' THEN 2
                WHEN '25-34' THEN 3
                WHEN '35-44' THEN 4
                WHEN '45-54' THEN 5
                WHEN '55+' THEN 6
                ELSE 7
              END
          ) age_data
        ),
        'gender', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'gender', COALESCE(u.gender, 'Not specified'),
              'count', COUNT(*),
              'clicks', COUNT(*) FILTER (WHERE ai.clicked = true),
              'conversions', COUNT(*) FILTER (WHERE ai.converted = true)
            )
          )
          FROM ad_impressions ai
          LEFT JOIN users u ON ai.user_id = u.id
          WHERE ai.ad_id = ad_id_param
          GROUP BY COALESCE(u.gender, 'Not specified')
        ),
        'interests', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'interest', interest,
              'count', count,
              'clicks', clicks,
              'conversions', conversions
            )
          )
          FROM (
            SELECT 
              unnest(u.interests) as interest,
              COUNT(*) as count,
              COUNT(*) FILTER (WHERE ai.clicked = true) as clicks,
              COUNT(*) FILTER (WHERE ai.converted = true) as conversions
            FROM ad_impressions ai
            LEFT JOIN users u ON ai.user_id = u.id
            WHERE ai.ad_id = ad_id_param
              AND u.interests IS NOT NULL
              AND array_length(u.interests, 1) > 0
            GROUP BY interest
            ORDER BY count DESC
            LIMIT 10
          ) interests_data
        ),
        'business_types', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'business_type', COALESCE(bp.type, 'Not specified'),
              'count', COUNT(*),
              'clicks', COUNT(*) FILTER (WHERE ai.clicked = true),
              'conversions', COUNT(*) FILTER (WHERE ai.converted = true)
            )
          )
          FROM ad_impressions ai
          LEFT JOIN business_profiles bp ON ai.business_id = bp.id
          WHERE ai.ad_id = ad_id_param
          GROUP BY COALESCE(bp.type, 'Not specified')
        ),
        'business_stages', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'stage', COALESCE(bp.stage, 'Not specified'),
              'count', COUNT(*),
              'clicks', COUNT(*) FILTER (WHERE ai.clicked = true),
              'conversions', COUNT(*) FILTER (WHERE ai.converted = true)
            )
          )
          FROM ad_impressions ai
          LEFT JOIN business_profiles bp ON ai.business_id = bp.id
          WHERE ai.ad_id = ad_id_param
          GROUP BY COALESCE(bp.stage, 'Not specified')
        ),
        'locations', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'location', COALESCE(bp.location, 'Not specified'),
              'count', COUNT(*),
              'clicks', COUNT(*) FILTER (WHERE ai.clicked = true),
              'conversions', COUNT(*) FILTER (WHERE ai.converted = true)
            )
          )
          FROM ad_impressions ai
          LEFT JOIN business_profiles bp ON ai.business_id = bp.id
          WHERE ai.ad_id = ad_id_param
          GROUP BY COALESCE(bp.location, 'Not specified')
          ORDER BY count DESC
          LIMIT 10
        )
      )
    ),
    'time_analytics', (
      SELECT jsonb_build_object(
        'hourly', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'hour', EXTRACT(HOUR FROM viewed_at)::INTEGER,
              'count', COUNT(*),
              'clicks', COUNT(*) FILTER (WHERE clicked = true)
            )
          )
          FROM ad_impressions
          WHERE ad_id = ad_id_param
          GROUP BY EXTRACT(HOUR FROM viewed_at)
          ORDER BY EXTRACT(HOUR FROM viewed_at)
        ),
        'daily', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'date', DATE(viewed_at),
              'count', COUNT(*),
              'clicks', COUNT(*) FILTER (WHERE clicked = true),
              'conversions', COUNT(*) FILTER (WHERE converted = true)
            )
          )
          FROM ad_impressions
          WHERE ad_id = ad_id_param
          GROUP BY DATE(viewed_at)
          ORDER BY DATE(viewed_at) DESC
          LIMIT 30
        )
      )
    ),
    'locations', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'location', location,
          'count', COUNT(*),
          'clicks', COUNT(*) FILTER (WHERE clicked = true),
          'conversions', COUNT(*) FILTER (WHERE converted = true)
        )
      )
      FROM ad_impressions
      WHERE ad_id = ad_id_param
      GROUP BY location
      ORDER BY count DESC
    )
  ) INTO result
  FROM ad_impressions
  WHERE ad_id = ad_id_param
  LIMIT 1;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_ad_analytics(UUID) TO authenticated;

-- Create a view for easier querying (optional)
CREATE OR REPLACE VIEW ad_analytics_view AS
SELECT 
  ai.ad_id,
  ai.user_id,
  u.gender,
  EXTRACT(YEAR FROM AGE(u.birth_date))::INTEGER as age,
  u.interests,
  bp.type as business_type,
  bp.stage as business_stage,
  bp.location as business_location,
  ai.location as ad_location,
  ai.viewed_at,
  ai.clicked,
  ai.clicked_at,
  ai.converted,
  ai.converted_at
FROM ad_impressions ai
LEFT JOIN users u ON ai.user_id = u.id
LEFT JOIN business_profiles bp ON ai.business_id = bp.id;

-- Grant select on view
GRANT SELECT ON ad_analytics_view TO authenticated;
