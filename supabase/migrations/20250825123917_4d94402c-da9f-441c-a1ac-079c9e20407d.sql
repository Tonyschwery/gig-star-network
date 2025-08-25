-- Create triggers for automatic email notifications

-- Trigger for new bookings (notify talent and admin)
CREATE OR REPLACE FUNCTION public.send_booking_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  talent_user_id UUID;
  service_role_key TEXT;
BEGIN
  -- Get service role key safely
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

  -- Only proceed if we have the service role key
  IF service_role_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get talent user_id if talent is assigned
  IF NEW.talent_id IS NOT NULL THEN
    SELECT user_id INTO talent_user_id 
    FROM public.talent_profiles 
    WHERE id = NEW.talent_id;
  END IF;
  
  -- Send booking notification email
  IF talent_user_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'emailType', 'booking',
        'userIds', ARRAY[talent_user_id],
        'bookingId', NEW.id
      )
    );
  END IF;

  -- Send admin notification
  PERFORM net.http_post(
    url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'emailType', 'admin',
      'userIds', ARRAY[]::uuid[],
      'bookingId', NEW.id,
      'notificationType', 'new_booking'
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new bookings
DROP TRIGGER IF EXISTS trigger_booking_email_notification ON public.bookings;
CREATE TRIGGER trigger_booking_email_notification
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.send_booking_email_notification();

-- Trigger for booking status changes (notify booker, talent, and admin)
CREATE OR REPLACE FUNCTION public.send_booking_status_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  talent_user_id UUID;
  service_role_key TEXT;
  user_ids UUID[];
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get service role key safely
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

  -- Only proceed if we have the service role key
  IF service_role_key IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get talent user_id if talent is assigned
  IF NEW.talent_id IS NOT NULL THEN
    SELECT user_id INTO talent_user_id 
    FROM public.talent_profiles 
    WHERE id = NEW.talent_id;
  END IF;
  
  -- Build user_ids array (booker + talent if exists)
  user_ids := ARRAY[NEW.user_id];
  IF talent_user_id IS NOT NULL AND talent_user_id != NEW.user_id THEN
    user_ids := user_ids || ARRAY[talent_user_id];
  END IF;
  
  -- Send booking status change notification
  PERFORM net.http_post(
    url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'emailType', 'booking',
      'userIds', user_ids,
      'bookingId', NEW.id
    )
  );

  -- Send admin notification for completed bookings
  IF NEW.status = 'completed' THEN
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'emailType', 'admin',
        'userIds', ARRAY[]::uuid[],
        'bookingId', NEW.id,
        'notificationType', 'booking_completed'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for booking status changes
DROP TRIGGER IF EXISTS trigger_booking_status_email_notification ON public.bookings;
CREATE TRIGGER trigger_booking_status_email_notification
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.send_booking_status_email_notification();

-- Trigger for new chat messages (notify recipient)
CREATE OR REPLACE FUNCTION public.send_message_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recipient_id UUID;
  service_role_key TEXT;
BEGIN
  -- Get service role key safely
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

  -- Only proceed if we have the service role key
  IF service_role_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the booking to find the recipient (other party in the conversation)
  SELECT 
    CASE 
      WHEN b.user_id = NEW.sender_id THEN tp.user_id  -- sender is booker, recipient is talent
      ELSE b.user_id  -- sender is talent, recipient is booker
    END
  INTO recipient_id
  FROM public.bookings b
  LEFT JOIN public.talent_profiles tp ON b.talent_id = tp.id
  WHERE b.id = NEW.booking_id;

  -- Only send email if there's a recipient (not the sender)
  IF recipient_id IS NOT NULL AND recipient_id != NEW.sender_id THEN
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'emailType', 'message',
        'userIds', ARRAY[recipient_id],
        'messageId', NEW.id,
        'bookingId', NEW.booking_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new chat messages
DROP TRIGGER IF EXISTS trigger_message_email_notification ON public.chat_messages;
CREATE TRIGGER trigger_message_email_notification
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_email_notification();

-- Trigger for payment completion (notify booker, talent, and admin)
CREATE OR REPLACE FUNCTION public.send_payment_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  booking_record RECORD;
  service_role_key TEXT;
  user_ids UUID[];
BEGIN
  -- Only notify when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    
    -- Get service role key safely
    BEGIN
      service_role_key := current_setting('app.settings.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      service_role_key := NULL;
    END;

    -- Only proceed if we have the service role key
    IF service_role_key IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get booking and talent details
    SELECT b.*, tp.user_id as talent_user_id
    INTO booking_record
    FROM public.bookings b
    LEFT JOIN public.talent_profiles tp ON b.talent_id = tp.id
    WHERE b.id = NEW.booking_id;

    IF booking_record IS NOT NULL THEN
      -- Build user_ids array (booker + talent if exists)
      user_ids := ARRAY[booking_record.user_id];
      IF booking_record.talent_user_id IS NOT NULL AND booking_record.talent_user_id != booking_record.user_id THEN
        user_ids := user_ids || ARRAY[booking_record.talent_user_id];
      END IF;

      -- Send payment notification email
      PERFORM net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'emailType', 'payment',
          'userIds', user_ids,
          'paymentId', NEW.id
        )
      );

      -- Send admin notification
      PERFORM net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'emailType', 'admin',
          'userIds', ARRAY[]::uuid[],
          'paymentId', NEW.id,
          'notificationType', 'payment_completed'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for payment completion
DROP TRIGGER IF EXISTS trigger_payment_email_notification ON public.payments;
CREATE TRIGGER trigger_payment_email_notification
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_payment_email_notification();