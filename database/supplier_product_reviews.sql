-- ============================================
-- SUPPLIER PRODUCT REVIEWS
-- Run after: supplier_marketplace_schema.sql
-- Adds: supplier_product_reviews (one per user per product)
-- ============================================

CREATE TABLE IF NOT EXISTS public.supplier_product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.supplier_marketplace_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_product_reviews_product ON public.supplier_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_product_reviews_user ON public.supplier_product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_product_reviews_created ON public.supplier_product_reviews(created_at DESC);

-- RLS
ALTER TABLE public.supplier_product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read non-hidden product reviews" ON public.supplier_product_reviews;
CREATE POLICY "Read non-hidden product reviews" ON public.supplier_product_reviews
  FOR SELECT USING (is_hidden = false);

DROP POLICY IF EXISTS "Users create own product review" ON public.supplier_product_reviews;
CREATE POLICY "Users create own product review" ON public.supplier_product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own product review" ON public.supplier_product_reviews;
CREATE POLICY "Users update own product review" ON public.supplier_product_reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own product review" ON public.supplier_product_reviews;
CREATE POLICY "Users delete own product review" ON public.supplier_product_reviews
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins hide product reviews" ON public.supplier_product_reviews;
CREATE POLICY "Admins hide product reviews" ON public.supplier_product_reviews
  FOR UPDATE USING (public.user_is_admin(auth.uid()));
