-- Create trigger for booking status change notifications
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
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS booking_status_change_notifications ON public.bookings;
CREATE TRIGGER booking_status_change_notifications
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_status_notifications();