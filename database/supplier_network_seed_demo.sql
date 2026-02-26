-- ============================================
-- SUPPLIER NETWORK – Demo seed data (optional)
-- Run after: supplier_network_upgrade.sql
-- Replace placeholder UUIDs with real auth.users / supplier_marketplace_profiles IDs from your DB.
-- ============================================

-- Example: set verification_tier on existing approved profiles (uncomment and set IDs)
-- UPDATE public.supplier_marketplace_profiles SET verification_tier = 'verified' WHERE id = 'YOUR_PROFILE_ID';
-- UPDATE public.supplier_marketplace_profiles SET verification_tier = 'manufacturer', featured = true WHERE id = 'ANOTHER_PROFILE_ID';

-- Example: set subcategory status to approved for existing subcategories (uncomment if needed)
-- UPDATE public.supplier_marketplace_subcategories SET status = 'approved' WHERE status = 'pending' AND created_at < NOW();

-- Example: add product fields to existing products (uncomment and adjust)
-- UPDATE public.supplier_marketplace_products SET unit_type = 'unit', price_type = 'negotiable', lead_time_days = 7 WHERE status = 'published' LIMIT 5;

-- No inserts with hardcoded UUIDs here; use Supabase dashboard or app to create:
-- 1) One approved supplier profile (from application or admin).
-- 2) One RFQ from a buyer user to that profile.
-- 3) One supplier_quote for that RFQ.
-- 4) One conversation + messages between buyer and supplier.
-- 5) One saved_supplier and one followed_supplier for the buyer.
-- 6) One complaint in 'supplier_response' with supplier_response and supplier_evidence_urls set.
