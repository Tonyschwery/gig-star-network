-- Fix the remaining event request functions with search_path
CREATE OR REPLACE FUNCTION public.create_event_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create notification when admin_reply is added
  IF OLD.admin_reply IS NULL AND NEW.admin_reply IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      created_at
    ) VALUES (
      NEW.user_id,
      'admin_reply',
      'Response to Your Event Request',
      'QTalents has responded to your event request. Check your requests to see the reply.',
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_status_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
            WHEN NEW.status = 'accepted' THEN 'Booking Request Accepted'
            WHEN NEW.status = 'confirmed' THEN 'Booking Confirmed'
            WHEN NEW.status = 'declined' THEN 'Booking Request Declined'
            WHEN NEW.status = 'cancelled' THEN 'Booking Cancelled'
            WHEN NEW.status = 'completed' THEN 'Booking Completed'
            ELSE 'Booking Status Update'
          END,
          CASE 
            WHEN NEW.status = 'pending' THEN 'You have received a new booking request from ' || NEW.booker_name || ' for ' || NEW.event_type || ' event on ' || NEW.event_date::date::text
            WHEN NEW.status = 'accepted' THEN 'You have accepted the booking request from ' || NEW.booker_name
            WHEN NEW.status = 'confirmed' THEN 'Your booking with ' || NEW.booker_name || ' has been confirmed'
            WHEN NEW.status = 'declined' THEN 'You have declined the booking request from ' || NEW.booker_name
            WHEN NEW.status = 'cancelled' THEN 'Booking with ' || NEW.booker_name || ' has been cancelled'
            WHEN NEW.status = 'completed' THEN 'Booking with ' || NEW.booker_name || ' has been completed'
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
          WHEN NEW.status = 'accepted' THEN 'Booking Request Accepted!'
          WHEN NEW.status = 'confirmed' THEN 'Booking Confirmed'
          WHEN NEW.status = 'declined' THEN 'Booking Request Declined'
          WHEN NEW.status = 'cancelled' THEN 'Booking Cancelled'
          WHEN NEW.status = 'completed' THEN 'Booking Completed'
          ELSE 'Booking Status Update'
        END,
        CASE 
          WHEN NEW.status = 'pending' THEN 'Your booking request has been sent and is waiting for approval'
          WHEN NEW.status = 'accepted' THEN 'Great news! Your booking request has been accepted'
          WHEN NEW.status = 'confirmed' THEN 'Your booking has been confirmed'
          WHEN NEW.status = 'declined' THEN 'Unfortunately, your booking request has been declined'
          WHEN NEW.status = 'cancelled' THEN 'Your booking has been cancelled'
          WHEN NEW.status = 'completed' THEN 'Your booking has been completed'
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
$$;

CREATE OR REPLACE FUNCTION public.update_event_request_reply_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Only update replied_at if admin_reply was added or changed
  IF OLD.admin_reply IS DISTINCT FROM NEW.admin_reply AND NEW.admin_reply IS NOT NULL THEN
    NEW.replied_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_chat_messages_on_decline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete chat messages when booking is declined
  IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
    DELETE FROM public.chat_messages WHERE booking_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete chat messages for bookings that are past their event date and completed/declined
  DELETE FROM public.chat_messages 
  WHERE booking_id IN (
    SELECT id FROM public.bookings 
    WHERE event_date < CURRENT_DATE 
    AND status IN ('completed', 'declined')
  );
END;
$$;