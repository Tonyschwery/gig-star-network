-- Update existing database functions to trigger email notifications

-- Update the booking status change notification function
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  recipient_id UUID;
  talent_user_id UUID;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get talent user_id if talent is assigned
  IF NEW.talent_id IS NOT NULL THEN
    SELECT user_id INTO talent_user_id 
    FROM public.talent_profiles 
    WHERE id = NEW.talent_id;
  END IF;
  
  -- Notify booker about status changes
  IF NEW.status = 'approved' THEN
    notification_title := 'Booking Approved';
    notification_message := 'Your ' || NEW.event_type || ' event booking has been approved by the talent.';
  ELSIF NEW.status = 'declined' THEN
    notification_title := 'Booking Declined';
    notification_message := 'Your ' || NEW.event_type || ' event booking has been declined by the talent.';
  ELSIF NEW.status = 'completed' THEN
    notification_title := 'Booking Completed';
    notification_message := 'Your ' || NEW.event_type || ' event booking has been completed.';
  ELSE
    RETURN NEW; -- Don't notify for other status changes
  END IF;
  
  -- Create notification for booker
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    booking_id
  ) VALUES (
    NEW.user_id,
    'booking_status_change',
    notification_title,
    notification_message,
    NEW.id
  );

  -- Trigger email notification
  PERFORM net.http_post(
    url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'emailType', 'booking',
      'userIds', ARRAY[NEW.user_id] || CASE WHEN talent_user_id IS NOT NULL THEN ARRAY[talent_user_id] ELSE ARRAY[]::uuid[] END,
      'bookingId', NEW.id
    )
  );

  -- Send admin notification for completed bookings
  IF NEW.status = 'completed' THEN
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
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
$function$;

-- Update the new booking notification function
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  talent_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get talent's user_id if talent is assigned
  IF NEW.talent_id IS NOT NULL THEN
    SELECT user_id INTO talent_user_id 
    FROM public.talent_profiles 
    WHERE id = NEW.talent_id;
    
    -- Create notification for talent
    IF talent_user_id IS NOT NULL THEN
      notification_title := 'New Booking Request';
      notification_message := 'You have received a new booking request for a ' || NEW.event_type || ' event.';
      
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        booking_id
      ) VALUES (
        talent_user_id,
        'new_booking',
        notification_title,
        notification_message,
        NEW.id
      );

      -- Trigger email notification for talent
      PERFORM net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body := jsonb_build_object(
          'emailType', 'booking',
          'userIds', ARRAY[talent_user_id],
          'bookingId', NEW.id
        )
      );
    END IF;
  END IF;

  -- Send admin notification for new bookings
  PERFORM net.http_post(
    url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
    body := jsonb_build_object(
      'emailType', 'admin',
      'userIds', ARRAY[]::uuid[],
      'bookingId', NEW.id,
      'notificationType', 'new_booking'
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Update the message notification function
CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  booking_record RECORD;
  recipient_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record 
  FROM public.bookings 
  WHERE id = NEW.booking_id;
  
  -- Determine recipient based on sender type
  IF NEW.sender_type = 'talent' THEN
    -- Talent sent message, notify the booker
    recipient_id := booking_record.user_id;
    notification_title := 'New Message from Talent';
    notification_message := 'You have received a new message about your ' || booking_record.event_type || ' event.';
  ELSE
    -- Booker sent message, notify the talent
    -- Get talent's user_id from talent_profiles
    SELECT user_id INTO recipient_id 
    FROM public.talent_profiles 
    WHERE id = booking_record.talent_id;
    
    notification_title := 'New Message from Booker';
    notification_message := 'You have received a new message about a ' || booking_record.event_type || ' event.';
  END IF;
  
  -- Create notification if recipient exists
  IF recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      booking_id,
      message_id
    ) VALUES (
      recipient_id,
      'new_message',
      notification_title,
      notification_message,
      NEW.booking_id,
      NEW.id
    );

    -- Trigger email notification
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'emailType', 'message',
        'userIds', ARRAY[recipient_id],
        'bookingId', NEW.booking_id,
        'messageId', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create function to handle payment notifications
CREATE OR REPLACE FUNCTION public.notify_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  booking_record RECORD;
  talent_user_id UUID;
BEGIN
  -- Only notify when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    
    -- Get booking and talent details
    SELECT b.*, tp.user_id as talent_user_id
    INTO booking_record
    FROM public.bookings b
    LEFT JOIN public.talent_profiles tp ON b.talent_id = tp.id
    WHERE b.id = NEW.booking_id;

    IF booking_record IS NOT NULL THEN
      -- Send email notifications to booker and talent
      PERFORM net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body := jsonb_build_object(
          'emailType', 'payment',
          'userIds', ARRAY[booking_record.user_id] || CASE WHEN booking_record.talent_user_id IS NOT NULL THEN ARRAY[booking_record.talent_user_id] ELSE ARRAY[]::uuid[] END,
          'paymentId', NEW.id
        )
      );

      -- Send admin notification
      PERFORM net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
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
$function$;

-- Create trigger for payment notifications
DROP TRIGGER IF EXISTS notify_payment_completed_trigger ON public.payments;
CREATE TRIGGER notify_payment_completed_trigger
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_completed();

-- Create triggers for the existing functions
DROP TRIGGER IF EXISTS notify_booking_status_change_trigger ON public.bookings;
CREATE TRIGGER notify_booking_status_change_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status_change();

DROP TRIGGER IF EXISTS notify_new_booking_trigger ON public.bookings;
CREATE TRIGGER notify_new_booking_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_booking();

DROP TRIGGER IF EXISTS notify_message_received_trigger ON public.booking_messages;
CREATE TRIGGER notify_message_received_trigger
  AFTER INSERT ON public.booking_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_message_received();