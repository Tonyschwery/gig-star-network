-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booker_id UUID NOT NULL,
  talent_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(booker_id, talent_id, booking_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('booker', 'talent')),
  content TEXT NOT NULL,
  original_content TEXT, -- Store original before filtering
  is_filtered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
USING (
  auth.uid() = booker_id OR 
  auth.uid() IN (
    SELECT user_id FROM public.talent_profiles WHERE id = talent_id
  )
);

CREATE POLICY "Users can create conversations they participate in" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  auth.uid() = booker_id OR 
  auth.uid() IN (
    SELECT user_id FROM public.talent_profiles WHERE id = talent_id
  )
);

CREATE POLICY "Users can update conversations they participate in" 
ON public.conversations 
FOR UPDATE 
USING (
  auth.uid() = booker_id OR 
  auth.uid() IN (
    SELECT user_id FROM public.talent_profiles WHERE id = talent_id
  )
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE auth.uid() = booker_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.talent_profiles WHERE id = talent_id
    )
  )
);

CREATE POLICY "Users can create messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE auth.uid() = booker_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.talent_profiles WHERE id = talent_id
    )
  )
);

-- Content filtering function
CREATE OR REPLACE FUNCTION public.filter_message_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Store original content
  NEW.original_content := NEW.content;
  
  -- Apply content filtering using the existing messageFilter
  -- Remove phone numbers (various formats)
  NEW.content := regexp_replace(NEW.content, '\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[contact info hidden]', 'g');
  NEW.content := regexp_replace(NEW.content, '\(\d{3}\)\s?\d{3}[-.]?\d{4}', '[contact info hidden]', 'g');
  NEW.content := regexp_replace(NEW.content, '\+\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}', '[contact info hidden]', 'g');
  NEW.content := regexp_replace(NEW.content, '\b\d{10,15}\b', '[contact info hidden]', 'g');
  
  -- Remove URLs and websites
  NEW.content := regexp_replace(NEW.content, 'https?://[^\s]+', '[contact info hidden]', 'gi');
  NEW.content := regexp_replace(NEW.content, 'www\.[^\s]+', '[contact info hidden]', 'gi');
  NEW.content := regexp_replace(NEW.content, '\b[a-zA-Z0-9-]+\.(com|net|org|edu|gov|co|io|me|ly|tv|app|dev|tech|ai|xyz|info|biz|ca|us|uk|de|fr|it|es|jp|kr|au|nl|se|no|dk|fi|pl|ru|br|mx|ar|cl|pe|ve|co|ec|py|uy|bo|gq|sr|gy|fk)\b[^\s]*', '[contact info hidden]', 'gi');
  
  -- Remove email addresses
  NEW.content := regexp_replace(NEW.content, '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[contact info hidden]', 'g');
  
  -- Remove social media handles
  NEW.content := regexp_replace(NEW.content, '@[a-zA-Z0-9_]+', '[contact info hidden]', 'g');
  
  -- Set filtered flag if content changed
  IF NEW.content != NEW.original_content THEN
    NEW.is_filtered := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for content filtering
CREATE TRIGGER filter_messages_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.filter_message_content();

-- Create trigger to update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_booker_id ON public.conversations(booker_id);
CREATE INDEX IF NOT EXISTS idx_conversations_talent_id ON public.conversations(talent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_booking_id ON public.conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;