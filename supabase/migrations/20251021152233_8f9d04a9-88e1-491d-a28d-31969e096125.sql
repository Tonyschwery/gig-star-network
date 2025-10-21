-- Part 1: Drop and recreate handle_new_user_profile() to only create profiles entry
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

-- New function that ONLY creates profiles entry, NOT talent_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create basic profiles entry
  -- Talent profiles will be created by ensure_profile RPC AFTER email confirmation
  INSERT INTO public.profiles (id, email, full_name, role, onboarding_complete)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'booker'),
    false  -- Mark as incomplete for talents
  );
  
  RETURN NEW;
END;
$function$;

-- Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

-- Part 2: Update ensure_profile() to create talent_profiles after email confirmation
CREATE OR REPLACE FUNCTION public.ensure_profile(p_user_id uuid, p_email text, p_role text)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_result public.profiles;
  v_user_metadata JSONB;
BEGIN
  -- Normalize role
  v_role := COALESCE(LOWER(p_role), 'booker');
  IF v_role NOT IN ('talent', 'booker', 'admin') THEN
    v_role := 'booker';
  END IF;

  -- Insert or update profile
  INSERT INTO public.profiles (id, email, role, onboarding_complete)
  VALUES (p_user_id, p_email, v_role, true)
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    onboarding_complete = true,
    updated_at = NOW()
  RETURNING * INTO v_result;

  -- For talent users, create talent_profiles if not exists
  IF v_role = 'talent' THEN
    -- Get user metadata from auth.users
    SELECT raw_user_meta_data INTO v_user_metadata
    FROM auth.users
    WHERE id = p_user_id;

    -- Create talent profile if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM talent_profiles WHERE user_id = p_user_id) THEN
      INSERT INTO public.talent_profiles (
        user_id,
        artist_name,
        act,
        gender,
        music_genres,
        biography,
        age,
        nationality,
        rate_per_hour,
        currency,
        location,
        picture_url
      ) VALUES (
        p_user_id,
        v_user_metadata ->> 'artist_name',
        NULLIF(v_user_metadata ->> 'act', '')::public.talent_act,
        NULLIF(v_user_metadata ->> 'gender', '')::public.talent_gender,
        COALESCE(
          (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_user_metadata -> 'music_genres')),
          '{}'::text[]
        ),
        COALESCE(v_user_metadata ->> 'biography', ''),
        COALESCE(v_user_metadata ->> 'age', ''),
        COALESCE(v_user_metadata ->> 'nationality', ''),
        NULLIF(v_user_metadata ->> 'rate_per_hour', '')::numeric,
        COALESCE(v_user_metadata ->> 'currency', 'USD'),
        COALESCE(v_user_metadata ->> 'location', ''),
        NULLIF(v_user_metadata ->> 'picture_url', '')  -- Will be NULL if empty or base64
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$function$;