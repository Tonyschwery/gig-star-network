-- Update the age column in talent_profiles to store text instead of integer
ALTER TABLE public.talent_profiles 
ALTER COLUMN age TYPE text;