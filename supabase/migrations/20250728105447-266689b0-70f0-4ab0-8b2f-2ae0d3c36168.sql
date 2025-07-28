-- Part 3: Add is_read column to messages table for chat notifications
ALTER TABLE public.messages 
ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;

-- Create an index for efficient querying of unread messages
CREATE INDEX idx_messages_unread_user 
ON public.messages (user_id, is_read) 
WHERE is_read = FALSE;

-- Create function to mark messages as read for a conversation
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(
  conversation_id_param UUID,
  user_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Mark messages as read for the specific conversation where the user is NOT the sender
  UPDATE public.messages 
  SET is_read = TRUE, updated_at = now()
  WHERE conversation_id = conversation_id_param 
    AND user_id != user_id_param 
    AND is_read = FALSE;
END;
$$;

-- Create function to get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  unread_count INTEGER := 0;
BEGIN
  -- Count unread messages where the user is the recipient (not the sender)
  -- We need to check which conversations this user participates in
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM public.messages m
  WHERE m.user_id != user_id_param -- Message is not from the current user
    AND m.is_read = FALSE
    AND EXISTS (
      -- Check if current user is part of this conversation (either as booker or talent)
      SELECT 1 
      FROM public.conversations c
      JOIN public.bookings b ON c.booking_id = b.id
      WHERE c.id = m.conversation_id
        AND (
          b.user_id = user_id_param OR -- User is the booker
          EXISTS (
            SELECT 1 
            FROM public.talent_profiles tp 
            WHERE tp.id = b.talent_id AND tp.user_id = user_id_param -- User is the talent
          )
        )
    );
    
  RETURN unread_count;
END;
$$;