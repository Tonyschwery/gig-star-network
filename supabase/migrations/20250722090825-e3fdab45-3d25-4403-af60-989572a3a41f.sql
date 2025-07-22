-- Create a table for booking messages/chat
CREATE TABLE public.booking_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('talent', 'booker')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for booking messages
-- Users can view messages for bookings they are involved in
CREATE POLICY "Users can view messages for their bookings" 
ON public.booking_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id 
    AND (b.user_id = auth.uid() OR b.talent_id IN (
      SELECT tp.id FROM public.talent_profiles tp WHERE tp.user_id = auth.uid()
    ))
  )
);

-- Users can create messages for bookings they are involved in
CREATE POLICY "Users can create messages for their bookings" 
ON public.booking_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = booking_id 
    AND (b.user_id = auth.uid() OR b.talent_id IN (
      SELECT tp.id FROM public.talent_profiles tp WHERE tp.user_id = auth.uid()
    ))
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_booking_messages_updated_at
  BEFORE UPDATE ON public.booking_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_booking_messages_booking_id ON public.booking_messages(booking_id);
CREATE INDEX idx_booking_messages_created_at ON public.booking_messages(created_at);