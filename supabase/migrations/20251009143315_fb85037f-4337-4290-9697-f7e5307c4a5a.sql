-- Create a trigger to send email notifications when new messages are sent
CREATE OR REPLACE FUNCTION public.send_message_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_user_id UUID;
  booking_record RECORD;
  talent_user_id UUID;
  sender_name TEXT;
  recipient_email TEXT;
  recipient_name TEXT;
BEGIN
  -- Only send emails for booking-related messages (not admin support)
  IF NEW.booking_id IS NULL OR NEW.is_admin_chat = true THEN
    RETURN NEW;
  END IF;

  -- Get booking details
  SELECT * INTO booking_record 
  FROM public.bookings 
  WHERE id = NEW.booking_id;
  
  IF booking_record IS NULL OR booking_record.event_type = 'admin_support' THEN
    RETURN NEW;
  END IF;
  
  -- Get talent user_id if talent exists
  IF booking_record.talent_id IS NOT NULL THEN
    SELECT user_id INTO talent_user_id 
    FROM public.talent_profiles 
    WHERE id = booking_record.talent_id;
  END IF;
  
  -- Determine recipient (who should get the email - not the sender)
  IF NEW.sender_id = booking_record.user_id THEN
    -- Booker sent message, notify talent
    recipient_user_id := talent_user_id;
    sender_name := booking_record.booker_name;
  ELSIF NEW.sender_id = talent_user_id THEN
    -- Talent sent message, notify booker
    recipient_user_id := booking_record.user_id;
    SELECT artist_name INTO sender_name 
    FROM public.talent_profiles 
    WHERE user_id = NEW.sender_id;
  ELSE
    -- Unknown sender, skip
    RETURN NEW;
  END IF;
  
  -- Skip if no recipient
  IF recipient_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Invoke send-notification-email function asynchronously
  -- This will check email preferences and send the email if enabled
  PERFORM
    net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'emailType', 'message',
        'userIds', jsonb_build_array(recipient_user_id),
        'bookingId', NEW.booking_id,
        'messageId', NEW.id
      )
    );
  
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists and create it
DROP TRIGGER IF EXISTS on_new_message_send_email ON public.chat_messages;

CREATE TRIGGER on_new_message_send_email
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_email_notification();