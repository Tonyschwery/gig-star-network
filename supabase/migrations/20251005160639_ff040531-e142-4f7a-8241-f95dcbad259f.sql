-- Create ensure_profile function to guarantee profile exists
CREATE OR REPLACE FUNCTION public.ensure_profile(
  p_user_id UUID,
  p_email TEXT,
  p_role TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_result public.profiles;
BEGIN
  -- Normalize role
  IF p_role IS NULL THEN
    v_role := NULL;
  ELSE
    v_role := LOWER(p_role);
    IF v_role NOT IN ('talent', 'booker') THEN
      v_role := NULL;
    END IF;
  END IF;

  -- Insert or update profile
  INSERT INTO public.profiles (id, email, role)
  VALUES (p_user_id, p_email, v_role)
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;