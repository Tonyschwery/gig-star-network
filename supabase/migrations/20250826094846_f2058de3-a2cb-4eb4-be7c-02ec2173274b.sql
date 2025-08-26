-- Create email logs table for error tracking
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  sender_email TEXT NOT NULL DEFAULT 'noreply@qtalent.live',
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on email logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs
CREATE POLICY "Admins can view email logs" 
ON public.email_logs 
FOR SELECT 
USING (is_admin(auth.uid()));

-- System can insert/update email logs
CREATE POLICY "System can insert email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update email logs" 
ON public.email_logs 
FOR UPDATE 
USING (true);

-- Create database function to send emails via edge function
CREATE OR REPLACE FUNCTION public.send_email_notification(
  event_type TEXT,
  recipient_emails TEXT[],
  email_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_role_key TEXT;
  recipient_email TEXT;
  log_id UUID;
BEGIN
  -- Get service role key from admin_settings
  SELECT setting_value INTO service_role_key 
  FROM admin_settings 
  WHERE setting_key = 'service_role_key';
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE LOG 'Service role key not found in admin_settings for email notification';
    RETURN;
  END IF;

  -- Send email to each recipient
  FOREACH recipient_email IN ARRAY recipient_emails
  LOOP
    -- Create email log entry
    INSERT INTO public.email_logs (
      event_type, 
      recipient_email, 
      recipient_name, 
      subject, 
      data
    ) VALUES (
      event_type,
      recipient_email,
      COALESCE((email_data->>'recipient_name'), 'User'),
      COALESCE((email_data->>'subject'), event_type),
      email_data
    ) RETURNING id INTO log_id;

    -- Send email via edge function
    BEGIN
      PERFORM net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'type', event_type,
          'recipientEmail', recipient_email,
          'data', email_data,
          'logId', log_id
        )
      );
      
      -- Mark as sent
      UPDATE public.email_logs 
      SET status = 'sent', updated_at = now() 
      WHERE id = log_id;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't block the operation
      UPDATE public.email_logs 
      SET 
        status = 'failed', 
        error_message = SQLERRM, 
        updated_at = now() 
      WHERE id = log_id;
      
      RAISE LOG 'Failed to send email notification: %', SQLERRM;
    END;
  END LOOP;
END;
$$;

-- User signup trigger (auth.users)
CREATE OR REPLACE FUNCTION public.handle_user_signup_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  admin_emails TEXT[] := ARRAY['qtalentslive@gmail.com'];
BEGIN
  -- Extract user name from metadata
  user_name := COALESCE(
    (NEW.raw_user_meta_data->>'name'), 
    CONCAT(NEW.raw_user_meta_data->>'firstName', ' ', NEW.raw_user_meta_data->>'lastName'),
    'New User'
  );

  -- Send welcome email to user
  PERFORM public.send_email_notification(
    'user_signup_welcome',
    ARRAY[NEW.email],
    jsonb_build_object(
      'recipient_name', user_name,
      'user_email', NEW.email,
      'user_id', NEW.id,
      'subject', 'Welcome to Qtalent.live!'
    )
  );

  -- Send admin notification
  PERFORM public.send_email_notification(
    'admin_user_signup',
    admin_emails,
    jsonb_build_object(
      'recipient_name', 'Admin',
      'user_name', user_name,
      'user_email', NEW.email,
      'user_id', NEW.id,
      'signup_date', NEW.created_at,
      'subject', 'New User Signup on Qtalent'
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for user signup
DROP TRIGGER IF EXISTS on_user_signup_send_emails ON auth.users;
CREATE TRIGGER on_user_signup_send_emails
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_signup_emails();

-- Talent profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_talent_profile_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  admin_emails TEXT[] := ARRAY['qtalentslive@gmail.com'];
BEGIN
  -- Get user email from auth.users
  SELECT au.email INTO user_email
  FROM auth.users au
  WHERE au.id = NEW.user_id;

  user_name := COALESCE(NEW.artist_name, 'New Talent');

  -- Send talent welcome email
  PERFORM public.send_email_notification(
    'talent_welcome',
    ARRAY[user_email],
    jsonb_build_object(
      'recipient_name', user_name,
      'artist_name', NEW.artist_name,
      'user_email', user_email,
      'talent_id', NEW.id,
      'subject', 'Congratulations! Your Talent Profile is Now Live'
    )
  );

  -- Send admin notification
  PERFORM public.send_email_notification(
    'admin_talent_created',
    admin_emails,
    jsonb_build_object(
      'recipient_name', 'Admin',
      'artist_name', NEW.artist_name,
      'talent_email', user_email,
      'talent_id', NEW.id,
      'act', NEW.act,
      'rate_per_hour', NEW.rate_per_hour,
      'currency', NEW.currency,
      'subject', 'New Talent Profile Created'
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for talent profile creation
DROP TRIGGER IF EXISTS on_talent_profile_created_send_emails ON public.talent_profiles;
CREATE TRIGGER on_talent_profile_created_send_emails
  AFTER INSERT ON public.talent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_talent_profile_emails();