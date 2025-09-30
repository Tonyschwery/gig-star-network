-- Simplify booking status flow by removing obsolete statuses
-- This migration updates database functions to remove references to 'accepted' and 'completed' statuses

-- Update cleanup_expired_bookings function to delete ALL past events
CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete ALL bookings that are past their event date (automatic cleanup)
  DELETE FROM public.bookings 
  WHERE event_date < CURRENT_DATE;
  
  -- Also delete associated chat messages for past bookings
  DELETE FROM public.chat_messages 
  WHERE booking_id IN (
    SELECT id FROM public.bookings 
    WHERE event_date < CURRENT_DATE
  );
  
  -- Delete associated notifications for past bookings
  DELETE FROM public.notifications
  WHERE booking_id IN (
    SELECT id FROM public.bookings 
    WHERE event_date < CURRENT_DATE
  );
END;
$function$;

-- Update create_booking_status_notifications to remove 'accepted' and 'completed' handling
CREATE OR REPLACE FUNCTION public.create_booking_status_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create notifications when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Get talent user_id from talent_profiles table
    DECLARE
      talent_user_id UUID;
    BEGIN
      SELECT user_id INTO talent_user_id 
      FROM public.talent_profiles 
      WHERE id = NEW.talent_id;
      
      -- Notification for the talent (if talent exists)
      IF talent_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          user_id, 
          title, 
          message, 
          type, 
          booking_id,
          created_at
        ) VALUES (
          talent_user_id,
          CASE 
            WHEN NEW.status = 'pending' THEN 'New Booking Request'
            WHEN NEW.status = 'confirmed' THEN 'Booking Confirmed'
            WHEN NEW.status = 'declined' THEN 'Booking Request Declined'
            WHEN NEW.status = 'cancelled' THEN 'Booking Cancelled'
            ELSE 'Booking Status Update'
          END,
          CASE 
            WHEN NEW.status = 'pending' THEN 'You have received a new booking request from ' || NEW.booker_name || ' for ' || NEW.event_type || ' event on ' || NEW.event_date::date::text
            WHEN NEW.status = 'confirmed' THEN 'Your booking with ' || NEW.booker_name || ' has been confirmed'
            WHEN NEW.status = 'declined' THEN 'You have declined the booking request from ' || NEW.booker_name
            WHEN NEW.status = 'cancelled' THEN 'Booking with ' || NEW.booker_name || ' has been cancelled'
            ELSE 'Booking status updated to ' || NEW.status
          END,
          'booking_' || NEW.status,
          NEW.id,
          now()
        );
      END IF;
      
      -- Notification for the booker
      INSERT INTO public.notifications (
        user_id, 
        title, 
        message, 
        type, 
        booking_id,
        created_at
      ) VALUES (
        NEW.user_id,
        CASE 
          WHEN NEW.status = 'pending' THEN 'Booking Request Sent'
          WHEN NEW.status = 'confirmed' THEN 'Booking Confirmed'
          WHEN NEW.status = 'declined' THEN 'Booking Request Declined'
          WHEN NEW.status = 'cancelled' THEN 'Booking Cancelled'
          ELSE 'Booking Status Update'
        END,
        CASE 
          WHEN NEW.status = 'pending' THEN 'Your booking request has been sent and is waiting for approval'
          WHEN NEW.status = 'confirmed' THEN 'Your booking has been confirmed'
          WHEN NEW.status = 'declined' THEN 'Unfortunately, your booking request has been declined'
          WHEN NEW.status = 'cancelled' THEN 'Your booking has been cancelled'
          ELSE 'Booking status updated to ' || NEW.status
        END,
        'booking_' || NEW.status,
        NEW.id,
        now()
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update create_booking_notifications to remove 'accepted' and 'completed' handling
CREATE OR REPLACE FUNCTION public.create_booking_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  talent_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only create notifications when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Get talent user_id from talent_profiles table
    SELECT user_id INTO talent_user_id 
    FROM public.talent_profiles 
    WHERE id = NEW.talent_id;
    
    -- Set notification content based on status
    CASE NEW.status
      WHEN 'confirmed' THEN
        notification_title := 'Booking Confirmed';
        notification_message := 'Your booking has been confirmed and is ready to go!';
        notification_type := 'booking_confirmed';
      WHEN 'declined' THEN
        notification_title := 'Booking Request Declined';
        notification_message := 'Unfortunately, your booking request has been declined.';
        notification_type := 'booking_declined';
      WHEN 'cancelled' THEN
        notification_title := 'Booking Cancelled';
        notification_message := 'Your booking has been cancelled.';
        notification_type := 'booking_cancelled';
      ELSE
        notification_title := 'Booking Status Update';
        notification_message := 'Your booking status has been updated to ' || NEW.status;
        notification_type := 'booking_update';
    END CASE;
    
    -- Create notification for the booker
    INSERT INTO public.notifications (
      user_id, 
      title, 
      message, 
      type, 
      booking_id,
      created_at
    ) VALUES (
      NEW.user_id,
      notification_title,
      notification_message,
      notification_type,
      NEW.id,
      now()
    );
    
    -- Create notification for talent if status is pending (new booking request)
    IF NEW.status = 'pending' AND talent_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, 
        title, 
        message, 
        type, 
        booking_id,
        created_at
      ) VALUES (
        talent_user_id,
        'New Booking Request',
        'You have received a new booking request from ' || NEW.booker_name || ' for ' || NEW.event_type || ' event.',
        'booking_request',
        NEW.id,
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;