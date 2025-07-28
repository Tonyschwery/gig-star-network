-- Fix security warnings by setting search_path on functions
CREATE OR REPLACE FUNCTION public.filter_message_content(content TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.apply_message_filter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.content := public.filter_message_content(NEW.content);
  RETURN NEW;
END;
$$;