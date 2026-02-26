-- Feature config for admin-mailing
-- Visible to: super_admin, admin, moderator (via access.roles)
INSERT INTO public.feature_config (feature_id, name, description, category, enabled, enabled_by_default, can_be_disabled, is_premium, premium_plan_ids, access, visibility, created_at, updated_at)
VALUES (
  'admin-mailing',
  'Admin Mailing',
  'Send email campaigns to suppliers and business owners. Segments, templates, and analytics.',
  'admin',
  true,
  true,
  false,
  false,
  '{}',
  '{"roles": ["super_admin", "admin", "moderator"]}'::jsonb,
  '{"type": "admin_only"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (feature_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  access = EXCLUDED.access,
  visibility = EXCLUDED.visibility,
  updated_at = NOW();

-- Ensure category 'Admin' is allowed (if there's a check)
-- ALTER TABLE public.feature_config DROP CONSTRAINT IF EXISTS feature_config_category_check;
-- ALTER TABLE public.feature_config ADD CONSTRAINT feature_config_category_check
--   CHECK (category IN (..., 'Admin'));
