-- Create function to notify booking status changes
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER AS $$
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to notify new bookings
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS TRIGGER AS $$
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
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_notify_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status_change();

CREATE TRIGGER trigger_notify_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_booking();