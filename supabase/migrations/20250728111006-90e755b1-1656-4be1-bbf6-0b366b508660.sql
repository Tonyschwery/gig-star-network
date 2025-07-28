-- Function to send welcome email when a new user signs up
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  service_role_key TEXT;
  user_metadata JSONB;
BEGIN
  -- Get service role key safely
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

  -- Only send email if service role key is available
  IF service_role_key IS NOT NULL THEN
    -- Get user metadata
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Send welcome email via Edge Function
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'type', 'user_signup',
        'userId', NEW.id,
        'email', NEW.email,
        'userData', jsonb_build_object(
          'firstName', user_metadata ->> 'first_name',
          'lastName', user_metadata ->> 'last_name'
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to send talent welcome email when a talent profile is created
CREATE OR REPLACE FUNCTION public.send_talent_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  service_role_key TEXT;
  user_record RECORD;
BEGIN
  -- Get service role key safely
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

  -- Only send email if service role key is available
  IF service_role_key IS NOT NULL THEN
    -- Get user details from auth.users
    SELECT email INTO user_record
    FROM auth.users
    WHERE id = NEW.user_id;
    
    IF user_record.email IS NOT NULL THEN
      -- Send talent welcome email via Edge Function
      PERFORM net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/welcome-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', 'talent_profile_created',
          'userId', NEW.user_id,
          'email', user_record.email,
          'userData', jsonb_build_object(
            'artistName', NEW.artist_name
          )
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created_welcome_email ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome_email
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.send_welcome_email();

-- Create trigger for new talent profiles
DROP TRIGGER IF EXISTS on_talent_profile_created_welcome_email ON public.talent_profiles;
CREATE TRIGGER on_talent_profile_created_welcome_email
  AFTER INSERT ON public.talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.send_talent_welcome_email();