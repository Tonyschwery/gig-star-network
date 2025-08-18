-- Create trigger function to notify users of new chat messages
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get the booking to find the recipient (other party in the conversation)
  SELECT 
    CASE 
      WHEN b.user_id = NEW.sender_id THEN tp.user_id  -- sender is booker, recipient is talent
      ELSE b.user_id  -- sender is talent, recipient is booker
    END,
    CASE
      WHEN b.user_id = NEW.sender_id THEN b.booker_name  -- sender is booker
      ELSE tp.artist_name  -- sender is talent
    END
  INTO recipient_id, sender_name
  FROM public.bookings b
  LEFT JOIN public.talent_profiles tp ON b.talent_id = tp.id
  WHERE b.id = NEW.booking_id;

  -- Only create notification if there's a recipient (not the sender)
  IF recipient_id IS NOT NULL AND recipient_id != NEW.sender_id THEN
    notification_title := 'New Message';
    notification_message := (sender_name || ' sent you a message');

    -- Create notification for the recipient
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      booking_id
    ) VALUES (
      recipient_id,
      'new_message',
      notification_title,
      notification_message,
      NEW.booking_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for new chat messages
CREATE TRIGGER notify_chat_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();