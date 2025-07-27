-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.filter_message_content()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Store original content
  NEW.original_content := NEW.content;
  
  -- Apply content filtering
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
$$;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;