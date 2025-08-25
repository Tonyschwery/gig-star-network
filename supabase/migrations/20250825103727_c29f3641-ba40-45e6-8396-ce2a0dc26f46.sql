-- Fix email trigger functions to work without database-level service role key
-- Update send_welcome_email function to work with edge functions properly
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_metadata JSONB;
BEGIN
  -- Get user metadata
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Send welcome email to user via Edge Function
  -- Using the service role key that's available in the edge function itself
  PERFORM net.http_post(
    url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
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

  -- Send admin notification about new signup
  PERFORM net.http_post(
    url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'admin-signup-notification',
      'userEmail', NEW.email,
      'userData', jsonb_build_object(
        'firstName', user_metadata ->> 'first_name',
        'lastName', user_metadata ->> 'last_name'
      )
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Update send_talent_welcome_email function
CREATE OR REPLACE FUNCTION public.send_talent_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_record RECORD;
BEGIN
  -- Get user details from auth.users
  SELECT email INTO user_record
  FROM auth.users
  WHERE id = NEW.user_id;
  
  IF user_record.email IS NOT NULL THEN
    -- Send talent welcome email via Edge Function
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
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
  
  RETURN NEW;
END;
$function$;