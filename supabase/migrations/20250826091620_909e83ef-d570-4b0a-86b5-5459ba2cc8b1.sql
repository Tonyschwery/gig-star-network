-- Drop existing restrictive policy and create new public access policy
DROP POLICY IF EXISTS "Public view for talent discovery" ON public.talent_profiles;
DROP POLICY IF EXISTS "Talent owners can view their own profile" ON public.talent_profiles;

-- Create a single policy that allows all public access to view profiles
CREATE POLICY "Allow public read access to talent profiles" 
ON public.talent_profiles 
FOR SELECT 
USING (true);

-- Verify the policy was created
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'talent_profiles' AND schemaname = 'public';