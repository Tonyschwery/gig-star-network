-- Check view definition and fix RLS on talent_profiles table
SELECT definition FROM pg_views WHERE viewname = 'talent_profiles_public';

-- Update RLS policy on talent_profiles table to allow public access
CREATE POLICY "Public view for talent discovery" 
ON public.talent_profiles 
FOR SELECT 
USING (true);