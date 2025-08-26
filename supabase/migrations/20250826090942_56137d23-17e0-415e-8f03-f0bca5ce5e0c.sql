-- Create triggers for all email notifications

-- Trigger for new event requests (both admin notification and user confirmation)
CREATE TRIGGER event_request_email_trigger
  AFTER INSERT ON public.event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.send_event_request_email_notification();

-- Trigger for new bookings (admin, talent, and booker notifications)
CREATE TRIGGER booking_email_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.send_booking_email_notification();

-- Trigger for booking status changes
CREATE TRIGGER booking_status_email_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.send_booking_status_email_notification();

-- Trigger for new chat messages
CREATE TRIGGER message_email_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_email_notification();

-- Trigger for payment completions
CREATE TRIGGER payment_email_trigger
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_payment_email_notification();

-- Enable realtime for key tables to ensure triggers fire properly
ALTER TABLE public.event_requests REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- Add tables to realtime publication (skip bookings as it's already added)
DO $$
BEGIN
  -- Add event_requests if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'event_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_requests;
  END IF;
  
  -- Add chat_messages if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  
  -- Add payments if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;