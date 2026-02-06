-- Add revenue column for ad analytics calculations
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS revenue DECIMAL(15, 2) DEFAULT 0;

