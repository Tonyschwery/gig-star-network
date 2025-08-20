-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION handle_new_booking_notification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Create notification for the talent when a new booking is created
  IF NEW.talent_id IS NOT NULL THEN
    -- Get the talent's user_id
    INSERT INTO notifications (user_id, booking_id, type, title, message)
    SELECT 
      tp.user_id,
      NEW.id,
      'booking',
      'New Booking Request',
      'You have a new ' || NEW.event_type || ' booking request from ' || NEW.booker_name || '!'
    FROM talent_profiles tp
    WHERE tp.id = NEW.talent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION handle_booking_status_change()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the booker about status changes
    INSERT INTO notifications (user_id, booking_id, type, title, message)
    VALUES (
      NEW.user_id,
      NEW.id,
      'booking_status',
      'Booking Status Updated',
      'Your ' || NEW.event_type || ' booking status changed to ' || NEW.status || '.'
    );
    
    -- Notify the talent about status changes (if different from booker)
    IF NEW.talent_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, booking_id, type, title, message)
      SELECT 
        tp.user_id,
        NEW.id,
        'booking_status',
        'Booking Status Updated',
        'A ' || NEW.event_type || ' booking status changed to ' || NEW.status || '.'
      FROM talent_profiles tp
      WHERE tp.id = NEW.talent_id AND tp.user_id != NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;