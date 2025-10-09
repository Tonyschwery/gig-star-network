-- Update handle_new_user_profile to save talent onboarding data to draft
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  draft_data JSONB;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'booker');
  
  -- For talent users, save all metadata to onboarding_draft for post-verification use
  IF user_role = 'talent' THEN
    draft_data := NEW.raw_user_meta_data;
  ELSE
    draft_data := '{}'::jsonb;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, onboarding_complete, onboarding_draft)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    user_role,
    CASE 
      WHEN user_role = 'talent' THEN false
      ELSE true
    END,
    draft_data
  );
  
  -- For talent users, automatically create talent_profiles entry after email confirmation
  -- Only if they have profile data in metadata
  IF user_role = 'talent' AND NEW.raw_user_meta_data ? 'artist_name' THEN
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
      NEW.id,
      NEW.raw_user_meta_data ->> 'artist_name',
      NULLIF(NEW.raw_user_meta_data ->> 'act', '')::public.talent_act,
      NULLIF(NEW.raw_user_meta_data ->> 'gender', '')::public.talent_gender,
      COALESCE(
        (SELECT array_agg(value::text) FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'music_genres')),
        '{}'::text[]
      ),
      COALESCE(NEW.raw_user_meta_data ->> 'biography', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'age', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'nationality', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'rate_per_hour', '')::numeric,
      COALESCE(NEW.raw_user_meta_data ->> 'currency', 'USD'),
      COALESCE(NEW.raw_user_meta_data ->> 'location', ''),
      NEW.raw_user_meta_data ->> 'picture_url'
    );
    
    -- Mark onboarding as complete since we created the profile
    UPDATE public.profiles 
    SET onboarding_complete = true 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;