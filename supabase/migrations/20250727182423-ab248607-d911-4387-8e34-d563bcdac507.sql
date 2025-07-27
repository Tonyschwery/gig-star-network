-- Fix the notify_new_booking function to handle missing service role key
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
  service_role_key TEXT;
BEGIN
  -- Get service role key safely
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

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

      -- Only send email if service role key is available
      IF service_role_key IS NOT NULL THEN
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
    END IF;
  END IF;

  -- Send admin notification only if service role key is available
  IF service_role_key IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$function$