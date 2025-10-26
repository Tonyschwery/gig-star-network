-- Create function to cleanup expired event requests
CREATE OR REPLACE FUNCTION public.cleanup_expired_event_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete chat messages for expired event requests first
  DELETE FROM public.chat_messages 
  WHERE event_request_id IN (
    SELECT id FROM public.event_requests 
    WHERE event_date < CURRENT_DATE
  );
  
  -- Delete notifications for expired event requests
  DELETE FROM public.notifications
  WHERE event_request_id IN (
    SELECT id FROM public.event_requests 
    WHERE event_date < CURRENT_DATE
  );
  
  -- Delete expired event requests
  DELETE FROM public.event_requests 
  WHERE event_date < CURRENT_DATE;
END;
$function$;