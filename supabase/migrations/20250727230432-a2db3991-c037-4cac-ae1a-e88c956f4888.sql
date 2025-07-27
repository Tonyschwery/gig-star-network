-- Remove chat notification trigger
DROP TRIGGER IF EXISTS trigger_chat_notification_trigger ON public.messages;

-- Drop chat notification function
DROP FUNCTION IF EXISTS public.trigger_chat_notification();

-- Drop message content filter trigger
DROP TRIGGER IF EXISTS filter_message_content_trigger ON public.messages;

-- Drop message content filter function  
DROP FUNCTION IF EXISTS public.filter_message_content();

-- Drop chat-related tables
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.booking_messages CASCADE;