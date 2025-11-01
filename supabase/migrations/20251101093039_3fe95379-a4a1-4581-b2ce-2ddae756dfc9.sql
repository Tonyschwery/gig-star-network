-- Complete notification system rebuild with all functions and triggers

-- 1. Recreate notify_booking_status_change function
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  recipient_id UUID;
BEGIN
  -- Only notify on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Notify booker about status changes
  IF NEW.status IN ('approved', 'declined', 'completed') THEN
    IF NEW.status = 'approved' THEN
      notification_title := 'Booking Approved';
      notification_message := 'Your ' || NEW.event_type || ' event booking has been approved by the talent.';
    ELSIF NEW.status = 'declined' THEN
      notification_title := 'Booking Declined';
      notification_message := 'Your ' || NEW.event_type || ' event booking has been declined by the talent.';
    ELSIF NEW.status = 'completed' THEN
      notification_title := 'Booking Completed';
      notification_message := 'Your ' || NEW.event_type || ' event booking has been completed.';
    END IF;
    
    -- Create notification for booker
    INSERT INTO notifications (
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Recreate notify_new_booking function
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  talent_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get talent's user_id if talent is assigned
  IF NEW.talent_id IS NOT NULL THEN
    SELECT user_id INTO talent_user_id 
    FROM talent_profiles 
    WHERE id = NEW.talent_id;

    -- Create notification for talent
    IF talent_user_id IS NOT NULL THEN
      notification_title := 'New Booking Request';
      notification_message := 'You have received a new booking request for a ' || NEW.event_type || ' event.';

      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        booking_id
      ) VALUES (
        talent_user_id,
        'booking_request',
        notification_title,
        notification_message,
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Fix notify_message_received to create notifications
CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  booking_record RECORD;
  recipient_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Skip if this is admin chat
  IF NEW.is_admin_chat = true THEN
    RETURN NEW;
  END IF;

  -- Get booking details
  IF NEW.booking_id IS NOT NULL THEN
    SELECT b.*, b.user_id as booker_id, tp.user_id as talent_user_id
    INTO booking_record
    FROM bookings b
    LEFT JOIN talent_profiles tp ON tp.id = b.talent_id
    WHERE b.id = NEW.booking_id;

    IF booking_record IS NULL THEN
      RETURN NEW;
    END IF;

    -- Determine recipient (if sender is booker, notify talent; if sender is talent, notify booker)
    IF NEW.sender_id = booking_record.booker_id THEN
      -- Message from booker, notify talent
      recipient_id := booking_record.talent_user_id;
      notification_title := 'New Message from Booker';
      notification_message := 'You have received a new message about a ' || booking_record.event_type || ' event.';
    ELSE
      -- Message from talent, notify booker
      recipient_id := booking_record.booker_id;
      notification_title := 'New Message from Talent';
      notification_message := 'You have received a new message about your ' || booking_record.event_type || ' event.';
    END IF;

    -- Create notification if recipient exists
    IF recipient_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        booking_id,
        message_id
      ) VALUES (
        recipient_id,
        'message',
        notification_title,
        notification_message,
        booking_record.id,
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Create function to send push notifications when a notification is created
CREATE OR REPLACE FUNCTION public.send_push_notification_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  service_role_key TEXT;
  headers JSONB;
  body JSONB;
  notification_url TEXT;
BEGIN
  -- Get service role key safely
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

  -- Only send push if service role key is available
  IF service_role_key IS NOT NULL THEN
    -- Determine the URL based on notification type
    IF NEW.booking_id IS NOT NULL THEN
      notification_url := '/booker-dashboard?booking=' || NEW.booking_id;
    ELSE
      notification_url := '/';
    END IF;

    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    );

    body := jsonb_build_object(
      'userId', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'url', notification_url,
      'bookingId', NEW.booking_id
    );

    -- Call push notification edge function asynchronously
    PERFORM net.http_post(
      url := 'https://myxizupccweukrxfdqmc.supabase.co/functions/v1/send-push-notification',
      headers := headers,
      body := body
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_booking_status_change ON bookings;
DROP TRIGGER IF EXISTS trigger_notify_new_booking ON bookings;
DROP TRIGGER IF EXISTS trigger_notify_message_received ON chat_messages;
DROP TRIGGER IF EXISTS trigger_send_push_notification ON notifications;

-- 6. Create all necessary triggers
CREATE TRIGGER trigger_notify_booking_status_change
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_status_change();

CREATE TRIGGER trigger_notify_new_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking();

CREATE TRIGGER trigger_notify_message_received
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_received();

CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification_on_insert();