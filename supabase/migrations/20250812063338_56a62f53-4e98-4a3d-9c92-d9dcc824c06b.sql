-- Align message functions to use sender_id column
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(conversation_id_param uuid, user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark messages as read for the specific conversation where the user is NOT the sender
  UPDATE public.messages 
  SET is_read = TRUE, updated_at = now()
  WHERE conversation_id = conversation_id_param 
    AND sender_id != user_id_param 
    AND is_read = FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  unread_count INTEGER := 0;
BEGIN
  -- Count unread messages where the user is the recipient (not the sender)
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM public.messages m
  WHERE m.sender_id != user_id_param
    AND m.is_read = FALSE
    AND EXISTS (
      SELECT 1 
      FROM public.conversations c
      JOIN public.bookings b ON c.booking_id = b.id
      WHERE c.id = m.conversation_id
        AND (
          b.user_id = user_id_param OR 
          EXISTS (
            SELECT 1 
            FROM public.talent_profiles tp 
            WHERE tp.id = b.talent_id AND tp.user_id = user_id_param
          )
        )
    );
    
  RETURN unread_count;
END;
$function$;