-- Feature 2: Chat System Tables
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('talent', 'booker')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Feature 3: Add subscription columns to talent_profiles
ALTER TABLE public.talent_profiles 
ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'canceled')),
ADD COLUMN stripe_customer_id TEXT;

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations for their bookings" 
ON public.conversations FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    WHERE b.id = conversations.booking_id 
    AND (b.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.talent_profiles tp 
      WHERE tp.id = b.talent_id AND tp.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "System can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.bookings b ON b.id = c.booking_id
    WHERE c.id = messages.conversation_id 
    AND (b.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.talent_profiles tp 
      WHERE tp.id = b.talent_id AND tp.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can insert messages in their conversations" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.bookings b ON b.id = c.booking_id
    WHERE c.id = messages.conversation_id 
    AND (b.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.talent_profiles tp 
      WHERE tp.id = b.talent_id AND tp.user_id = auth.uid()
    ))
  )
);

-- Content filter function
CREATE OR REPLACE FUNCTION public.filter_message_content(content TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  filtered_content TEXT;
BEGIN
  filtered_content := content;
  
  -- Filter phone numbers (various formats)
  filtered_content := regexp_replace(filtered_content, '\(?[\d\s\-\.\(\)]{10,}\)?', '[REDACTED]', 'gi');
  
  -- Filter words "phone" and "number"
  filtered_content := regexp_replace(filtered_content, '\b(phone|number)\b', '[REDACTED]', 'gi');
  
  -- Filter website links
  filtered_content := regexp_replace(filtered_content, 'https?://[^\s]+', '[REDACTED]', 'gi');
  filtered_content := regexp_replace(filtered_content, 'www\.[^\s]+', '[REDACTED]', 'gi');
  filtered_content := regexp_replace(filtered_content, '[^\s]+\.(com|org|net|edu|gov|io|co)[^\s]*', '[REDACTED]', 'gi');
  
  -- Filter social media references
  filtered_content := regexp_replace(filtered_content, '\b(instagram|facebook)\b', '[REDACTED]', 'gi');
  
  RETURN filtered_content;
END;
$$;

-- Trigger to apply content filter
CREATE OR REPLACE FUNCTION public.apply_message_filter()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.content := public.filter_message_content(NEW.content);
  RETURN NEW;
END;
$$;

CREATE TRIGGER filter_messages_before_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_message_filter();

-- Update trigger for conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for messages  
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;