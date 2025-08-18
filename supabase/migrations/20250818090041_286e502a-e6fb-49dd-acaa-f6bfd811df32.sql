-- Create chat_messages table for persistent universal chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat messages
CREATE POLICY "Users can view messages for their bookings" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = chat_messages.booking_id 
    AND (bookings.user_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM public.talent_profiles 
           WHERE talent_profiles.id = bookings.talent_id 
           AND talent_profiles.user_id = auth.uid()
         ))
  )
);

CREATE POLICY "Users can create messages for their bookings" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE bookings.id = chat_messages.booking_id 
    AND (bookings.user_id = auth.uid() OR 
         EXISTS (
           SELECT 1 FROM public.talent_profiles 
           WHERE talent_profiles.id = bookings.talent_id 
           AND talent_profiles.user_id = auth.uid()
         ))
  )
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chat_messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;