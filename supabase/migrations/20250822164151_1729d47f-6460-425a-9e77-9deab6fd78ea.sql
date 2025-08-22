-- Create table for admin event requests
CREATE TABLE public.event_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_duration INTEGER NOT NULL,
  event_location TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for event requests
CREATE POLICY "Users can create their own event requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own event requests" 
ON public.event_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all event requests" 
ON public.event_requests 
FOR ALL 
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_event_requests_updated_at
BEFORE UPDATE ON public.event_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();