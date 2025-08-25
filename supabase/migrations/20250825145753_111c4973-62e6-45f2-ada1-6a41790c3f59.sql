-- Fix service role key configuration and email triggers
-- First, configure the service role key as a database setting
SELECT set_config('app.settings.service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkyOTg4NCwiZXhwIjoyMDY4NTA1ODg0fQ.FiNKlQ4x5N5BnfXpEtYOJzVtgDkfkT1bWGNBg5mFpRA', true);

-- Create improved booking notification trigger
CREATE OR REPLACE FUNCTION public.send_booking_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  talent_user_id UUID;
  service_role_key TEXT;
BEGIN
  -- Log the trigger execution
  RAISE LOG 'Booking email trigger fired for booking ID: %', NEW.id;
  
  -- Get service role key
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE LOG 'Service role key not found, cannot send email notifications';
    RETURN NEW;
  END IF;

  -- Get talent user_id if talent is assigned
  IF NEW.talent_id IS NOT NULL THEN
    SELECT user_id INTO talent_user_id 
    FROM public.talent_profiles 
    WHERE id = NEW.talent_id;
    RAISE LOG 'Found talent user_id: % for talent_id: %', talent_user_id, NEW.talent_id;
  END IF;
  
  -- Send booking notification email to talent (if assigned)
  IF talent_user_id IS NOT NULL THEN
    BEGIN
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
      RAISE LOG 'Booking notification email sent to talent user: %', talent_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Failed to send booking email to talent: %', SQLERRM;
    END;
  END IF;

  -- Send admin notification for new bookings
  BEGIN
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
    RAISE LOG 'Admin notification sent for new booking: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to send admin notification for booking: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;

-- Create booking status change notification trigger
CREATE OR REPLACE FUNCTION public.send_booking_status_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  talent_user_id UUID;
  service_role_key TEXT;
  user_ids UUID[];
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  RAISE LOG 'Booking status change trigger fired for booking ID: %, status: % -> %', NEW.id, OLD.status, NEW.status;
  
  -- Get service role key
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE LOG 'Service role key not found, cannot send email notifications';
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
  BEGIN
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
    RAISE LOG 'Booking status change notification sent to users: %', user_ids;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to send booking status change email: %', SQLERRM;
  END;

  -- Send admin notification for completed bookings
  IF NEW.status = 'completed' THEN
    BEGIN
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
      RAISE LOG 'Admin notification sent for completed booking: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Failed to send admin notification for completed booking: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create message notification trigger
CREATE OR REPLACE FUNCTION public.send_message_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id UUID;
  service_role_key TEXT;
BEGIN
  RAISE LOG 'Message email trigger fired for message ID: %', NEW.id;
  
  -- Get service role key
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE LOG 'Service role key not found, cannot send email notifications';
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
    BEGIN
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
      RAISE LOG 'Message notification sent to user: %', recipient_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Failed to send message email: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create payment notification trigger
CREATE OR REPLACE FUNCTION public.send_payment_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  booking_record RECORD;
  service_role_key TEXT;
  user_ids UUID[];
BEGIN
  -- Only notify when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    
    RAISE LOG 'Payment completion trigger fired for payment ID: %', NEW.id;
    
    -- Get service role key
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    IF service_role_key IS NULL OR service_role_key = '' THEN
      RAISE LOG 'Service role key not found, cannot send email notifications';
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
      BEGIN
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
        RAISE LOG 'Payment notification sent to users: %', user_ids;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to send payment email: %', SQLERRM;
      END;

      -- Send admin notification
      BEGIN
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
        RAISE LOG 'Admin payment notification sent for payment: %', NEW.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to send admin payment notification: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create event request notification trigger (MISSING FUNCTIONALITY)
CREATE OR REPLACE FUNCTION public.send_event_request_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  service_role_key TEXT;
BEGIN
  RAISE LOG 'Event request email trigger fired for request ID: %', NEW.id;
  
  -- Get service role key
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    RAISE LOG 'Service role key not found, cannot send email notifications';
    RETURN NEW;
  END IF;

  -- Send admin notification for new event requests
  BEGIN
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'emailType', 'admin',
        'userIds', ARRAY[]::uuid[],
        'eventRequestId', NEW.id,
        'notificationType', 'new_event_request'
      )
    );
    RAISE LOG 'Admin notification sent for new event request: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to send admin notification for event request: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS booking_email_notification ON public.bookings;
DROP TRIGGER IF EXISTS booking_status_email_notification ON public.bookings;
DROP TRIGGER IF EXISTS message_email_notification ON public.chat_messages;
DROP TRIGGER IF EXISTS payment_email_notification ON public.payments;
DROP TRIGGER IF EXISTS event_request_email_notification ON public.event_requests;

-- Create all email notification triggers
CREATE TRIGGER booking_email_notification
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.send_booking_email_notification();

CREATE TRIGGER booking_status_email_notification
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.send_booking_status_email_notification();

CREATE TRIGGER message_email_notification
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_email_notification();

CREATE TRIGGER payment_email_notification
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_payment_email_notification();

CREATE TRIGGER event_request_email_notification
  AFTER INSERT ON public.event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_request_email_notification();