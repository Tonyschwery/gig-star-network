-- Drop the age check constraint first
ALTER TABLE public.talent_profiles 
DROP CONSTRAINT talent_profiles_age_check;

-- Now update the age column to store text instead of integer
ALTER TABLE public.talent_profiles 
ALTER COLUMN age TYPE text;