-- Fix notification system by adding proper triggers and functions for booking status changes, messages, and admin communication

-- Create function to generate notifications for booking status changes  
CREATE OR REPLACE FUNCTION public.create_booking_notifications()
RETURNS TRIGGER AS $$
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
      WHEN 'accepted' THEN
        notification_title := 'Booking Request Accepted!';
        notification_message := 'Great news! Your booking request has been accepted by the talent.';
        notification_type := 'booking_accepted';
      WHEN 'declined' THEN
        notification_title := 'Booking Request Declined';
        notification_message := 'Unfortunately, your booking request has been declined.';
        notification_type := 'booking_declined';
      WHEN 'confirmed' THEN
        notification_title := 'Booking Confirmed';
        notification_message := 'Your booking has been confirmed and is ready to go!';
        notification_type := 'booking_confirmed';
      WHEN 'cancelled' THEN
        notification_title := 'Booking Cancelled';
        notification_message := 'Your booking has been cancelled.';
        notification_type := 'booking_cancelled';
      WHEN 'completed' THEN
        notification_title := 'Booking Completed';
        notification_message := 'Your booking has been completed successfully!';
        notification_type := 'booking_completed';
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for booking status notifications
DROP TRIGGER IF EXISTS booking_status_notifications_trigger ON public.bookings;
CREATE TRIGGER booking_status_notifications_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_notifications();

-- Create function to generate notifications for new chat messages
CREATE OR REPLACE FUNCTION public.create_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  talent_user_id UUID;
  recipient_user_id UUID;
  sender_name TEXT := 'User';
BEGIN
  -- Get booking details
  SELECT * INTO booking_record FROM public.bookings WHERE id = NEW.booking_id;
  
  IF booking_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get talent user_id if talent exists
  IF booking_record.talent_id IS NOT NULL THEN
    SELECT user_id INTO talent_user_id FROM public.talent_profiles WHERE id = booking_record.talent_id;
  END IF;
  
  -- Determine recipient (who should get the notification - not the sender)
  IF NEW.sender_id = booking_record.user_id THEN
    -- Booker sent message, notify talent
    recipient_user_id := talent_user_id;
    sender_name := booking_record.booker_name;
  ELSIF NEW.sender_id = talent_user_id THEN
    -- Talent sent message, notify booker
    recipient_user_id := booking_record.user_id;
    sender_name := 'Talent';
  ELSE
    -- Unknown sender, skip notification
    RETURN NEW;
  END IF;
  
  -- Create notification if recipient exists
  IF recipient_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      booking_id,
      message_id,
      created_at
    ) VALUES (
      recipient_user_id,
      'new_message',
      'New Message',
      sender_name || ' sent you a message about your ' || booking_record.event_type || ' event.',
      NEW.booking_id,
      NEW.id,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for message notifications
DROP TRIGGER IF EXISTS message_notifications_trigger ON public.chat_messages;
CREATE TRIGGER message_notifications_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notifications();

-- Create function for admin support messages (special booking for admin communication)
CREATE OR REPLACE FUNCTION public.create_admin_support_booking(user_id_param UUID)
RETURNS UUID AS $$
DECLARE
  support_booking_id UUID;
BEGIN
  -- Check if admin support booking already exists for this user
  SELECT id INTO support_booking_id 
  FROM public.bookings 
  WHERE user_id = user_id_param 
    AND event_type = 'admin_support'
    AND talent_id IS NULL;
  
  -- Create admin support booking if it doesn't exist
  IF support_booking_id IS NULL THEN
    INSERT INTO public.bookings (
      user_id,
      talent_id,
      event_type,
      event_location,
      event_address,
      event_date,
      event_duration,
      booker_name,
      booker_email,
      status,
      description
    ) VALUES (
      user_id_param,
      NULL,
      'admin_support',
      'Online',
      'QTalents Support Chat',
      CURRENT_DATE + INTERVAL '30 days', -- Future date to keep it active
      60, -- 1 hour default
      'Support Request',
      '',
      'confirmed',
      'Direct communication channel with QTalents support team'
    ) RETURNING id INTO support_booking_id;
  END IF;
  
  RETURN support_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to handle admin replies to event requests
CREATE OR REPLACE FUNCTION public.create_event_request_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for event request notifications
DROP TRIGGER IF EXISTS event_request_notifications_trigger ON public.event_requests;
CREATE TRIGGER event_request_notifications_trigger
  AFTER UPDATE ON public.event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_event_request_notification();