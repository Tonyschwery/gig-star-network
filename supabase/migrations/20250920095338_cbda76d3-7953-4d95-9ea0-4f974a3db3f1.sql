-- Fix the ambiguous user_id reference in create_notification_for_new_message function
CREATE OR REPLACE FUNCTION public.create_notification_for_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  recipient_user_id UUID;
  notification_message TEXT;
  link_path TEXT;
  sender_name TEXT;
  booker_id UUID;
  talent_user_id UUID;
  talent_profile_id UUID;
  event_type TEXT;
BEGIN
  -- Determine the recipient based on whether it's a booking or event request
  IF NEW.booking_id IS NOT NULL THEN
    -- It's a Direct Booking chat - fix the ambiguous user_id reference
    SELECT 
      bookings.user_id, 
      bookings.talent_id, 
      bookings.event_type, 
      talent_profiles.artist_name, 
      bookings.booker_name,
      talent_profiles.user_id
    INTO booker_id, talent_profile_id, event_type, sender_name, sender_name, talent_user_id
    FROM public.bookings
    LEFT JOIN public.talent_profiles ON public.bookings.talent_id = public.talent_profiles.id
    WHERE public.bookings.id = NEW.booking_id;

    IF NEW.sender_id = booker_id THEN
      recipient_user_id := talent_user_id;
      SELECT booker_name FROM public.bookings WHERE id = NEW.booking_id INTO sender_name;
      link_path := '/talent-dashboard';
    ELSE
      recipient_user_id := booker_id;
      SELECT artist_name FROM public.talent_profiles WHERE user_id = NEW.sender_id INTO sender_name;
      link_path := '/booker-dashboard';
    END IF;
    
    notification_message := 'New message from ' || sender_name || ' regarding your ' || event_type || ' booking.';

  ELSIF NEW.event_request_id IS NOT NULL THEN
    -- It's an Event Request chat
    SELECT user_id, booker_name, event_type
    INTO booker_id, sender_name, event_type
    FROM public.event_requests
    WHERE id = NEW.event_request_id;

    IF NEW.sender_id = booker_id THEN
      recipient_user_id := get_admin_user_id();
      link_path := '/admin/bookings';
    ELSE -- Admin is the sender
      recipient_user_id := booker_id;
      sender_name := 'QTalent Team';
      link_path := '/booker-dashboard';
    END IF;
    
    notification_message := 'New message from ' || sender_name || ' regarding your ' || event_type || ' request.';
  END IF;

  -- Insert the notification if a recipient was found
  IF recipient_user_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, message, booking_id, event_request_id, type, link_to)
    VALUES(recipient_user_id, notification_message, NEW.booking_id, NEW.event_request_id, 'new_message', link_path);
  END IF;

  RETURN NEW;
END;
$function$;

-- Remove the duplicate trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_new_message_create_notification ON public.chat_messages;