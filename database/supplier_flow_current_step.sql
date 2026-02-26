-- ============================================
-- Supplier flow: current_step for wizard resume
-- Run after: supplier_applications.sql, supplier_applications_fixes.sql
-- ============================================

-- Add current_step (0-based) for wizard; only meaningful when status IN ('draft','needs_info')
ALTER TABLE public.supplier_applications
  ADD COLUMN IF NOT EXISTS current_step INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.supplier_applications.current_step IS '0-based wizard step for draft/needs_info; used for resume';
