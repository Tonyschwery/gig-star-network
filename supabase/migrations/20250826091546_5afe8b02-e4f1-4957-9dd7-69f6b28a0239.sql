-- Check what RLS policies exist on talent_profiles table
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'talent_profiles' AND schemaname = 'public';

-- Check the talent_profiles_public view definition
SELECT definition 
FROM pg_views 
WHERE viewname = 'talent_profiles_public' AND schemaname = 'public';