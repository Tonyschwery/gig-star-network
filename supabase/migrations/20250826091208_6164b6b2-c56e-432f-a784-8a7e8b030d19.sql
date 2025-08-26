-- Fix RLS policy for talent_profiles_public view to allow anonymous access
DROP POLICY IF EXISTS "Public view for talent discovery" ON public.talent_profiles_public;

CREATE POLICY "Allow public access to talent profiles" 
ON public.talent_profiles_public 
FOR SELECT 
USING (true);