-- Create trigger to automatically delete chat messages when booking is declined
CREATE OR REPLACE FUNCTION public.cleanup_chat_messages_on_decline()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete chat messages when booking is declined
  IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
    DELETE FROM public.chat_messages WHERE booking_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for booking status changes
CREATE TRIGGER cleanup_chat_on_booking_decline
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_chat_messages_on_decline();

-- Create function to cleanup chat messages for expired events
CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_messages()
RETURNS void AS $$
BEGIN
  -- Delete chat messages for bookings that are past their event date and completed/declined
  DELETE FROM public.chat_messages 
  WHERE booking_id IN (
    SELECT id FROM public.bookings 
    WHERE event_date < CURRENT_DATE 
    AND status IN ('completed', 'declined')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;