-- Enable real-time functionality for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications table to realtime publication (only if not already added)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- Create function to auto-generate notifications for booking status changes
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking status changes, create notifications for both parties
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Notification for the talent
    INSERT INTO public.notifications (
      user_id, 
      title, 
      message, 
      type, 
      related_booking_id,
      created_at
    ) VALUES (
      NEW.talent_id,
      CASE 
        WHEN NEW.status = 'pending_approval' THEN 'New Booking Request'
        WHEN NEW.status = 'accepted' THEN 'Booking Request Accepted'
        WHEN NEW.status = 'confirmed' THEN 'Booking Confirmed'
        WHEN NEW.status = 'declined' THEN 'Booking Request Declined'
        WHEN NEW.status = 'cancelled' THEN 'Booking Cancelled'
        WHEN NEW.status = 'completed' THEN 'Booking Completed'
        ELSE 'Booking Status Update'
      END,
      CASE 
        WHEN NEW.status = 'pending_approval' THEN 'You have received a new booking request from ' || NEW.booker_name || ' for ' || NEW.event_type || ' event on ' || NEW.event_date::date::text
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
    
    -- Notification for the booker (using booker_id)
    INSERT INTO public.notifications (
      user_id, 
      title, 
      message, 
      type, 
      related_booking_id,
      created_at
    ) VALUES (
      NEW.booker_id,
      CASE 
        WHEN NEW.status = 'pending_approval' THEN 'Booking Request Sent'
        WHEN NEW.status = 'accepted' THEN 'Booking Request Accepted!'
        WHEN NEW.status = 'confirmed' THEN 'Booking Confirmed'
        WHEN NEW.status = 'declined' THEN 'Booking Request Declined'
        WHEN NEW.status = 'cancelled' THEN 'Booking Cancelled'
        WHEN NEW.status = 'completed' THEN 'Booking Completed'
        ELSE 'Booking Status Update'
      END,
      CASE 
        WHEN NEW.status = 'pending_approval' THEN 'Your booking request has been sent and is waiting for approval'
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking status changes
DROP TRIGGER IF EXISTS booking_status_notification_trigger ON public.bookings;
CREATE TRIGGER booking_status_notification_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_notification();

-- Enable real-time for bookings table
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add bookings table to realtime publication (only if not already added)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
END $$;