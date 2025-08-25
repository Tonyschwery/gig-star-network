-- Update the welcome email trigger to also send admin notification
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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

  -- Only send emails if service role key is available
  IF service_role_key IS NOT NULL THEN
    -- Get user metadata
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Send welcome email to user via Edge Function
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

    -- Send admin notification about new signup
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
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
  END IF;
  
  RETURN NEW;
END;
$function$;