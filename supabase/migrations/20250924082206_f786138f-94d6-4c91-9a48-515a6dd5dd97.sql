-- Create function to cleanup expired bookings
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete bookings that are past their event date by more than 24 hours
  DELETE FROM public.bookings 
  WHERE event_date < CURRENT_DATE - INTERVAL '1 day'
    AND status IN ('completed', 'cancelled', 'declined');
    
  -- Also delete associated chat messages for these bookings
  DELETE FROM public.chat_messages 
  WHERE booking_id IN (
    SELECT id FROM public.bookings 
    WHERE event_date < CURRENT_DATE - INTERVAL '1 day'
    AND status IN ('completed', 'cancelled', 'declined')
  );
  
  -- Delete associated notifications for these bookings  
  DELETE FROM public.notifications
  WHERE booking_id IN (
    SELECT id FROM public.bookings 
    WHERE event_date < CURRENT_DATE - INTERVAL '1 day'
    AND status IN ('completed', 'cancelled', 'declined')
  );
END;
$$;