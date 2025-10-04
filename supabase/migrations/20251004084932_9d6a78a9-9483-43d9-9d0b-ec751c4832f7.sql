-- Add onboarding fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_draft jsonb DEFAULT '{}'::jsonb;

-- Rename user_type to role for clarity
ALTER TABLE public.profiles 
RENAME COLUMN user_type TO role;

-- Create index for faster onboarding checks
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(id, onboarding_complete) WHERE role = 'talent';

-- Update existing talent profiles to mark them as complete if they have a talent_profile
UPDATE public.profiles p
SET onboarding_complete = true
WHERE p.role = 'talent' 
AND EXISTS (
  SELECT 1 FROM public.talent_profiles tp 
  WHERE tp.user_id = p.id
);

-- Update the handle_new_user_profile function to use 'role' instead of 'user_type'
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, onboarding_complete)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'booker'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'booker') = 'talent' THEN false
      ELSE true
    END
  );
  RETURN NEW;
END;
$function$;