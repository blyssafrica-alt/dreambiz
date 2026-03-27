-- ============================================
-- SUPPLIER PERFORMANCE: score view with badges (Part 5)
-- Run after: supplier_growth_procurement.sql (supplier_performance_metrics, supplier_marketplace_ranked)
-- ============================================

-- View: supplier performance with badges for display (buyers + admin + supplier dashboard)
CREATE OR REPLACE VIEW public.supplier_performance_score AS
SELECT
  r.id AS supplier_id,
  r.business_name,
  r.ranking_score,
  m.trust_score,
  m.avg_rating,
  m.review_count,
  m.rfq_total,
  m.rfq_responded,
  m.rfq_response_rate_pct,
  m.complaint_count,
  m.follower_count,
  r.avg_response_hours,
  r.featured,
  r.verification_tier,
  (
    SELECT array_remove(array[
      CASE WHEN r.avg_response_hours IS NOT NULL AND r.avg_response_hours <= 24 THEN 'Fast Responder' END,
      CASE WHEN COALESCE(m.rfq_response_rate_pct, 0) >= 80 AND COALESCE(m.rfq_total, 0) > 0 THEN 'Quick to Quote' END,
      CASE WHEN COALESCE(m.avg_rating, 0) >= 4 AND COALESCE(m.review_count, 0) >= 1 THEN 'Top Rated' END,
      CASE WHEN COALESCE(m.complaint_count, 0) = 0 AND COALESCE(m.review_count, 0) >= 1 THEN 'Reliable Supplier' END,
      CASE WHEN r.verification_tier IN ('verified', 'premium', 'manufacturer', 'distributor') THEN 'Verified' END,
      CASE WHEN r.featured THEN 'Featured' END
    ], NULL)
  ) AS badges
FROM public.supplier_marketplace_ranked r
LEFT JOIN public.supplier_performance_metrics m ON m.supplier_id = r.id
WHERE r.status = 'approved';

COMMENT ON VIEW public.supplier_performance_score IS 'Supplier performance and badges for marketplace, admin, and supplier dashboard';

-- Optional: employee permissions for inventory/reports (Part 8) - allow admins to assign
INSERT INTO public.employee_permissions (code, name, description, category) VALUES
  ('inventory:view', 'View inventory', 'Can view inventory and reorder suggestions', 'products'),
  ('inventory:edit', 'Edit inventory', 'Can update stock and reorder settings', 'products'),
  ('reports:view', 'View reports', 'Can view supplier profit and inventory valuation reports', 'finances')
ON CONFLICT (code) DO NOTHING;
