-- Fix user type tracking in database
-- Ensure all users have proper role/type set in profiles table

-- Update ensure_profile function to always sync role from user metadata
CREATE OR REPLACE FUNCTION public.ensure_profile(p_user_id uuid, p_email text, p_role text)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_result public.profiles;
BEGIN
  -- Normalize role
  IF p_role IS NULL THEN
    v_role := 'booker'; -- Default to booker if not specified
  ELSE
    v_role := LOWER(p_role);
    IF v_role NOT IN ('talent', 'booker', 'admin') THEN
      v_role := 'booker';
    END IF;
  END IF;

  -- Insert or update profile with role
  INSERT INTO public.profiles (id, email, role)
  VALUES (p_user_id, p_email, v_role)
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role, -- Always update role
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

-- Ensure existing booker users without explicit role are set to 'booker'
UPDATE public.profiles
SET role = 'booker', updated_at = NOW()
WHERE role IS NULL 
  AND id NOT IN (SELECT user_id FROM public.talent_profiles);

-- Ensure talent users have role set to 'talent'
UPDATE public.profiles
SET role = 'talent', updated_at = NOW()
WHERE id IN (SELECT user_id FROM public.talent_profiles)
  AND (role IS NULL OR role != 'talent');

-- Create index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

COMMENT ON FUNCTION public.ensure_profile(uuid, text, text) IS 'Ensures a profile exists with the correct role for the user';