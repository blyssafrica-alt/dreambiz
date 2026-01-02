-- Fix RLS Policies for exchange_rates table
-- Ensures authenticated users can access their own exchange rates
-- This is needed for the currency-onyx Edge Function to work correctly

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Users can insert their own exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Users can update their own exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Users can delete their own exchange rates" ON public.exchange_rates;

-- SELECT policy: Users can view their own exchange rates
-- Uses auth.uid() to match user_id column
CREATE POLICY "Users can view their own exchange rates" 
ON public.exchange_rates 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

-- INSERT policy: Users can insert their own exchange rates
-- Ensures user_id matches authenticated user
CREATE POLICY "Users can insert their own exchange rates" 
ON public.exchange_rates 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

-- UPDATE policy: Users can update their own exchange rates
-- Allows users to update their own records
CREATE POLICY "Users can update their own exchange rates" 
ON public.exchange_rates 
FOR UPDATE 
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- DELETE policy: Users can delete their own exchange rates
-- Allows users to delete their own records
CREATE POLICY "Users can delete their own exchange rates" 
ON public.exchange_rates 
FOR DELETE 
USING (auth.uid()::text = user_id::text);

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'exchange_rates'
ORDER BY policyname;

