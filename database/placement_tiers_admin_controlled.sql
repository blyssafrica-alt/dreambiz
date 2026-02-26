-- ============================================
-- Placement tiers: admin-controlled (description, benefits, display_order, highlight)
-- Run after sponsored_placements_paid_system.sql
-- ============================================

-- Extend supplier_sponsored_placement_pricing for full admin control
ALTER TABLE public.supplier_sponsored_placement_pricing
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS highlight_flag BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.supplier_sponsored_placement_pricing.description IS 'Admin-editable description shown on Promote page';
COMMENT ON COLUMN public.supplier_sponsored_placement_pricing.benefits IS 'Array of benefit strings, e.g. ["Featured on homepage", "Priority visibility"]';
COMMENT ON COLUMN public.supplier_sponsored_placement_pricing.display_order IS 'Order on Promote page (lower = first)';
COMMENT ON COLUMN public.supplier_sponsored_placement_pricing.highlight_flag IS 'Show as recommended / most popular';

-- Backfill display_order from priority_weight for existing rows
UPDATE public.supplier_sponsored_placement_pricing
SET display_order = COALESCE(display_order, (3 - priority_weight) * 10)
WHERE display_order = 0 OR display_order IS NULL;
UPDATE public.supplier_sponsored_placement_pricing SET display_order = 0 WHERE placement_type = 'homepage_featured';
UPDATE public.supplier_sponsored_placement_pricing SET display_order = 10 WHERE placement_type = 'feed_featured';
UPDATE public.supplier_sponsored_placement_pricing SET display_order = 20 WHERE placement_type = 'category_featured';

-- Backfill description and benefits for existing tiers
UPDATE public.supplier_sponsored_placement_pricing
SET description = 'Premium visibility on the marketplace homepage. Maximum reach for new buyers.',
    benefits = '["Featured on marketplace homepage", "Top placement in discovery", "30 days visibility"]'::jsonb,
    highlight_flag = true
WHERE placement_type = 'homepage_featured' AND (description IS NULL OR description = '');
UPDATE public.supplier_sponsored_placement_pricing
SET description = 'Highlight your store in the main feed. Great balance of reach and value.',
    benefits = '["Prominent feed placement", "14 days visibility", "Increased profile visits"]'::jsonb,
    highlight_flag = false
WHERE placement_type = 'feed_featured' AND (description IS NULL OR description = '');
UPDATE public.supplier_sponsored_placement_pricing
SET description = 'Get noticed in category browse. Ideal for targeted exposure.',
    benefits = '["Category featured slot", "7 days visibility", "Category-specific discovery"]'::jsonb,
    highlight_flag = false
WHERE placement_type = 'category_featured' AND (description IS NULL OR description = '');

CREATE INDEX IF NOT EXISTS idx_sponsored_pricing_display_order
  ON public.supplier_sponsored_placement_pricing(display_order);
