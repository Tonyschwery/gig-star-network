-- Restore admin_reply and replied_at columns to event_requests table for communication
ALTER TABLE public.event_requests 
ADD COLUMN admin_reply TEXT,
ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE;

-- Create trigger to update replied_at when admin_reply is added
CREATE OR REPLACE FUNCTION public.update_event_request_reply_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update replied_at if admin_reply was added or changed
  IF OLD.admin_reply IS DISTINCT FROM NEW.admin_reply AND NEW.admin_reply IS NOT NULL THEN
    NEW.replied_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event_requests
DROP TRIGGER IF EXISTS update_event_request_reply ON public.event_requests;
CREATE TRIGGER update_event_request_reply
  BEFORE UPDATE ON public.event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_request_reply_timestamp();