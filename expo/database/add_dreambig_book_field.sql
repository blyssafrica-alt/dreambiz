-- Add dreamBigBook field to business_profiles table
-- Run this in your Supabase SQL Editor

ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS dream_big_book TEXT 
CHECK (dream_big_book IN ('start-your-business', 'grow-your-business', 'manage-your-money', 'hire-and-lead', 'marketing-mastery', 'scale-up', 'none'));

-- Set default value for existing records
UPDATE business_profiles 
SET dream_big_book = 'none' 
WHERE dream_big_book IS NULL;
