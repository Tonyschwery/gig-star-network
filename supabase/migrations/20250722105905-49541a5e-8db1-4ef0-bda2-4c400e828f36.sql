-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.booking_messages(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to create notification when message is sent
CREATE OR REPLACE FUNCTION public.notify_message_received()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  recipient_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record 
  FROM public.bookings 
  WHERE id = NEW.booking_id;
  
  -- Determine recipient based on sender type
  IF NEW.sender_type = 'talent' THEN
    -- Talent sent message, notify the booker
    recipient_id := booking_record.user_id;
    notification_title := 'New Message from Talent';
    notification_message := 'You have received a new message about your ' || booking_record.event_type || ' event.';
  ELSE
    -- Booker sent message, notify the talent
    -- Get talent's user_id from talent_profiles
    SELECT user_id INTO recipient_id 
    FROM public.talent_profiles 
    WHERE id = booking_record.talent_id;
    
    notification_title := 'New Message from Booker';
    notification_message := 'You have received a new message about a ' || booking_record.event_type || ' event.';
  END IF;
  
  -- Create notification if recipient exists
  IF recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      booking_id,
      message_id
    ) VALUES (
      recipient_id,
      'new_message',
      notification_title,
      notification_message,
      NEW.booking_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create notifications
CREATE TRIGGER trigger_notify_message_received
  AFTER INSERT ON public.booking_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_message_received();

-- Create function to update timestamps
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();