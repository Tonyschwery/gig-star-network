-- Fix financial transaction data access security issues
-- Drop existing permissive policies and create more restrictive ones

-- Drop existing policies
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
DROP POLICY IF EXISTS "System can update payments" ON public.payments;

-- Create more restrictive policies for system operations
-- Only allow system operations via service role (not regular authenticated users)
CREATE POLICY "Service role can insert payments" ON public.payments
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update payments" ON public.payments
FOR UPDATE  
TO service_role
USING (true);

-- Add explicit policy to block all other access attempts
CREATE POLICY "Block unauthorized payment access" ON public.payments
FOR ALL
TO anon
USING (false);

-- Ensure existing user policies are properly restricted to authenticated users only
DROP POLICY IF EXISTS "Users can view their own payments as bookers" ON public.payments;
DROP POLICY IF EXISTS "Talents can view their earnings" ON public.payments;

-- Recreate user policies with explicit authentication requirements
CREATE POLICY "Authenticated bookers can view their payments" ON public.payments
FOR SELECT
TO authenticated
USING (auth.uid() = booker_id);

CREATE POLICY "Authenticated talents can view their earnings" ON public.payments
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.talent_profiles 
  WHERE talent_profiles.id = payments.talent_id 
  AND talent_profiles.user_id = auth.uid()
));

-- Add policy to prevent any modifications by regular users
CREATE POLICY "Block user modifications to payments" ON public.payments
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (false);

-- Add comment explaining the security model
COMMENT ON TABLE public.payments IS 'Financial transaction data - access restricted to involved parties only. System operations require service role.';