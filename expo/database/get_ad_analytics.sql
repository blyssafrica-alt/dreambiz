-- Function to get detailed ad analytics with demographics
-- This allows ad owners to see who is interacting with their ads
-- 
-- IMPORTANT: Run this entire script in Supabase SQL Editor
-- Make sure you're connected to the correct database

-- Drop function if it exists (to ensure clean recreation)
DROP FUNCTION IF EXISTS public.get_ad_analytics(UUID);

CREATE OR REPLACE FUNCTION public.get_ad_analytics(ad_id_param UUID)
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
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'age_group', age_group,
              'count', impression_count,
              'clicks', click_count,
              'conversions', conversion_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              age_group,
              COUNT(*) as impression_count,
              SUM(CASE WHEN clicked = true THEN 1 ELSE 0 END) as click_count,
              SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as conversion_count
            FROM (
              SELECT 
                ai.clicked,
                ai.converted,
                CASE 
                  WHEN u.birth_date IS NULL THEN 'Unknown'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) < 18 THEN 'Under 18'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 18 AND 24 THEN '18-24'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 25 AND 34 THEN '25-34'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 35 AND 44 THEN '35-44'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 45 AND 54 THEN '45-54'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) >= 55 THEN '55+'
                  ELSE 'Unknown'
                END as age_group
              FROM ad_impressions ai
              LEFT JOIN users u ON ai.user_id = u.id
              WHERE ai.ad_id = ad_id_param
            ) age_calc
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
        'age_groups_with_gender', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'age_group', age_group,
              'gender_breakdown', gender_breakdown
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              age_group,
              jsonb_agg(
                jsonb_build_object(
                  'gender', gender_val,
                  'count', impression_count,
                  'clicks', click_count,
                  'conversions', conversion_count
                )
              ) as gender_breakdown
            FROM (
              SELECT 
                CASE 
                  WHEN u.birth_date IS NULL THEN 'Unknown'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) < 18 THEN 'Under 18'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 18 AND 24 THEN '18-24'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 25 AND 34 THEN '25-34'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 35 AND 44 THEN '35-44'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 45 AND 54 THEN '45-54'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) >= 55 THEN '55+'
                  ELSE 'Unknown'
                END as age_group,
                COALESCE(u.gender, 'Not specified') as gender_val,
                COUNT(*) as impression_count,
                SUM(CASE WHEN ai.clicked = true THEN 1 ELSE 0 END) as click_count,
                SUM(CASE WHEN ai.converted = true THEN 1 ELSE 0 END) as conversion_count
              FROM ad_impressions ai
              LEFT JOIN users u ON ai.user_id = u.id
              WHERE ai.ad_id = ad_id_param
              GROUP BY 
                CASE 
                  WHEN u.birth_date IS NULL THEN 'Unknown'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) < 18 THEN 'Under 18'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 18 AND 24 THEN '18-24'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 25 AND 34 THEN '25-34'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 35 AND 44 THEN '35-44'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) BETWEEN 45 AND 54 THEN '45-54'
                  WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) >= 55 THEN '55+'
                  ELSE 'Unknown'
                END,
                COALESCE(u.gender, 'Not specified')
            ) age_gender_calc
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
          ) age_gender_data
        ),
        'gender', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'gender', gender_val,
              'count', impression_count,
              'clicks', click_count,
              'conversions', conversion_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              COALESCE(u.gender, 'Not specified') as gender_val,
              COUNT(*) as impression_count,
              SUM(CASE WHEN ai.clicked = true THEN 1 ELSE 0 END) as click_count,
              SUM(CASE WHEN ai.converted = true THEN 1 ELSE 0 END) as conversion_count
            FROM ad_impressions ai
            LEFT JOIN users u ON ai.user_id = u.id
            WHERE ai.ad_id = ad_id_param
            GROUP BY COALESCE(u.gender, 'Not specified')
          ) gender_data
        ),
        'interests', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'interest', interest,
              'count', impression_count,
              'clicks', click_count,
              'conversions', conversion_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              interest,
              COUNT(*) as impression_count,
              SUM(CASE WHEN clicked = true THEN 1 ELSE 0 END) as click_count,
              SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as conversion_count
            FROM (
              SELECT 
                unnest(u.interests) as interest,
                ai.clicked,
                ai.converted
              FROM ad_impressions ai
              LEFT JOIN users u ON ai.user_id = u.id
              WHERE ai.ad_id = ad_id_param
                AND u.interests IS NOT NULL
                AND array_length(u.interests, 1) > 0
            ) interests_expanded
            GROUP BY interest
            ORDER BY impression_count DESC
            LIMIT 10
          ) interests_data
        ),
        'business_types', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'business_type', business_type_val,
              'count', impression_count,
              'clicks', click_count,
              'conversions', conversion_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              COALESCE(bp.type, 'Not specified') as business_type_val,
              COUNT(*) as impression_count,
              SUM(CASE WHEN ai.clicked = true THEN 1 ELSE 0 END) as click_count,
              SUM(CASE WHEN ai.converted = true THEN 1 ELSE 0 END) as conversion_count
            FROM ad_impressions ai
            LEFT JOIN business_profiles bp ON ai.business_id = bp.id
            WHERE ai.ad_id = ad_id_param
            GROUP BY COALESCE(bp.type, 'Not specified')
          ) business_types_data
        ),
        'business_stages', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'stage', stage_val,
              'count', impression_count,
              'clicks', click_count,
              'conversions', conversion_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              COALESCE(bp.stage, 'Not specified') as stage_val,
              COUNT(*) as impression_count,
              SUM(CASE WHEN ai.clicked = true THEN 1 ELSE 0 END) as click_count,
              SUM(CASE WHEN ai.converted = true THEN 1 ELSE 0 END) as conversion_count
            FROM ad_impressions ai
            LEFT JOIN business_profiles bp ON ai.business_id = bp.id
            WHERE ai.ad_id = ad_id_param
            GROUP BY COALESCE(bp.stage, 'Not specified')
          ) business_stages_data
        ),
        'locations', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'location', location_val,
              'count', unique_users_count,
              'clicks', click_count,
              'conversions', conversion_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              COALESCE(bp.location, 'Not specified') as location_val,
              COUNT(DISTINCT ai.user_id) as unique_users_count,
              COUNT(DISTINCT CASE WHEN ai.clicked = true THEN ai.user_id END) as click_count,
              COUNT(DISTINCT CASE WHEN ai.converted = true THEN ai.user_id END) as conversion_count
            FROM ad_impressions ai
            LEFT JOIN business_profiles bp ON ai.business_id = bp.id
            WHERE ai.ad_id = ad_id_param
              AND bp.location IS NOT NULL
            GROUP BY COALESCE(bp.location, 'Not specified')
            HAVING COUNT(DISTINCT ai.user_id) > 0
            ORDER BY unique_users_count DESC
            LIMIT 10
          ) locations_data
        )
      )
    ),
    'time_analytics', (
      SELECT jsonb_build_object(
        'hourly', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'hour', hour_val,
              'count', impression_count,
              'clicks', click_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              EXTRACT(HOUR FROM viewed_at)::INTEGER as hour_val,
              COUNT(*) as impression_count,
              SUM(CASE WHEN clicked = true THEN 1 ELSE 0 END) as click_count
            FROM ad_impressions
            WHERE ad_id = ad_id_param
            GROUP BY EXTRACT(HOUR FROM viewed_at)
            ORDER BY EXTRACT(HOUR FROM viewed_at)
          ) hourly_data
        ),
        'daily', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'date', date_val,
              'count', impression_count,
              'clicks', click_count,
              'conversions', conversion_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              DATE(viewed_at) as date_val,
              COUNT(*) as impression_count,
              SUM(CASE WHEN clicked = true THEN 1 ELSE 0 END) as click_count,
              SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as conversion_count
            FROM ad_impressions
            WHERE ad_id = ad_id_param
            GROUP BY DATE(viewed_at)
            ORDER BY DATE(viewed_at) DESC
            LIMIT 30
          ) daily_data
        )
      )
    ),
    'placements', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'placement', placement_name,
          'count', unique_users_count,
          'clicks', click_count,
          'conversions', conversion_count
        )
      ), '[]'::jsonb)
      FROM (
        SELECT 
          CASE 
            WHEN location = 'dashboard' THEN 'Dashboard'
            WHEN location = 'documents' OR location LIKE 'document%' THEN 'Documents'
            WHEN location = 'products' THEN 'Products'
            WHEN location = 'customers' THEN 'Customers'
            WHEN location = 'finances' THEN 'Finances'
            WHEN location = 'reports' THEN 'Reports'
            WHEN location = 'cashflow' THEN 'Cashflow'
            WHEN location = 'tax' THEN 'Tax'
            WHEN location = 'accounts' THEN 'Accounts'
            WHEN location = 'projects' THEN 'Projects'
            WHEN location = 'employees' THEN 'Employees'
            WHEN location = 'suppliers' THEN 'Suppliers'
            WHEN location = 'budgets' THEN 'Budgets'
            WHEN location = 'insights' THEN 'Insights'
            ELSE INITCAP(REPLACE(location, '_', ' '))
          END as placement_name,
          COUNT(DISTINCT user_id) as unique_users_count,
          SUM(CASE WHEN clicked = true THEN 1 ELSE 0 END) as click_count,
          SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as conversion_count
        FROM ad_impressions
        WHERE ad_id = ad_id_param
        GROUP BY location
        ORDER BY unique_users_count DESC
      ) placements_data
    ),
        'ad_locations', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'location', location_val,
              'count', impression_count,
              'clicks', click_count,
              'conversions', conversion_count
            )
          ), '[]'::jsonb)
          FROM (
            SELECT 
              location as location_val,
              COUNT(*) as impression_count,
              SUM(CASE WHEN clicked = true THEN 1 ELSE 0 END) as click_count,
              SUM(CASE WHEN converted = true THEN 1 ELSE 0 END) as conversion_count
            FROM ad_impressions
            WHERE ad_id = ad_id_param
            GROUP BY location
            ORDER BY impression_count DESC
          ) ad_locations_data
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
