-- Create trigger to send admin email notifications when users message support
CREATE OR REPLACE FUNCTION public.notify_admin_on_support_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT := 'qtalentslive@gmail.com';
  booking_record RECORD;
  sender_user RECORD;
  sender_name TEXT;
BEGIN
  -- Get booking details to verify it's admin_support
  SELECT * INTO booking_record
  FROM public.bookings
  WHERE id = NEW.booking_id;
  
  -- Only proceed if this is an admin_support booking
  IF booking_record IS NULL OR booking_record.event_type != 'admin_support' THEN
    RETURN NEW;
  END IF;
  
  -- Check if sender is admin (if so, don't notify admin)
  IF public.is_admin(NEW.sender_id) THEN
    RETURN NEW;
  END IF;
  
  -- Get sender information
  SELECT 
    COALESCE(tp.artist_name, p.full_name, au.email) as name,
    au.email as user_email
  INTO sender_user
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  LEFT JOIN public.talent_profiles tp ON tp.user_id = au.id
  WHERE au.id = NEW.sender_id;
  
  sender_name := COALESCE(sender_user.name, 'User');
  
  -- Send email notification to admin via edge function
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'emailType', 'admin_support_message',
      'adminEmail', admin_email,
      'emailData', jsonb_build_object(
        'sender_name', sender_name,
        'sender_email', sender_user.user_email,
        'message_preview', substring(NEW.content, 1, 200),
        'message_id', NEW.id,
        'booking_id', NEW.booking_id,
        'user_id', NEW.sender_id
      )
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on chat_messages for admin support notifications
DROP TRIGGER IF EXISTS on_support_message_send_admin_email ON public.chat_messages;
CREATE TRIGGER on_support_message_send_admin_email
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_support_message();