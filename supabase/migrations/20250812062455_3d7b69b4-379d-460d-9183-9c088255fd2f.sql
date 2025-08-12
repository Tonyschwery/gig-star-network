-- Create triggers to support universal chat
-- Ensure conversation is automatically created for new bookings
DROP TRIGGER IF EXISTS create_conversation_after_booking_trg ON public.bookings;
CREATE TRIGGER create_conversation_after_booking_trg
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.create_conversation_after_booking();

-- Apply content filter to messages before insert
DROP TRIGGER IF EXISTS apply_message_filter_before_insert ON public.messages;
CREATE TRIGGER apply_message_filter_before_insert
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.apply_message_filter();

-- Notify frontend on new messages (optional but useful)
DROP TRIGGER IF EXISTS notify_message_received_after_insert ON public.messages;
CREATE TRIGGER notify_message_received_after_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_received();