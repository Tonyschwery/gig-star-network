-- Step 1: Remove duplicate triggers
DROP TRIGGER IF EXISTS trigger_notify_booking_status_change ON public.bookings;
DROP TRIGGER IF EXISTS trigger_notify_new_booking ON public.bookings;

-- Step 2: Fix the JSON formatting bug in notify_booking_status_change function
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
  service_role_key TEXT;
  headers JSONB;
  body JSONB;
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

  -- Only send emails if service role key is available
  IF service_role_key IS NOT NULL THEN
    -- CORRECTED: Use jsonb_build_object for safe header construction
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    );

    body := jsonb_build_object(
      'emailType', 'booking',
      'userIds', ARRAY[NEW.user_id] || CASE WHEN talent_user_id IS NOT NULL THEN ARRAY[talent_user_id] ELSE ARRAY[]::uuid[] END,
      'bookingId', NEW.id
    );

    -- Trigger email notification
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
      headers := headers,
      body := body
    );

    -- Send admin notification for completed bookings
    IF NEW.status = 'completed' THEN
      body := jsonb_build_object(
        'emailType', 'admin',
        'userIds', ARRAY[]::uuid[],
        'bookingId', NEW.id,
        'notificationType', 'booking_completed'
      );

      PERFORM net.http_post(
        url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-notification-email',
        headers := headers,
        body := body
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;