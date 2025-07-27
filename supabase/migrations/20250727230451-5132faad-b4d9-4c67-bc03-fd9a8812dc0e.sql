-- Remove all chat-related triggers first (with CASCADE if needed)
DROP TRIGGER IF EXISTS trigger_chat_notification_trigger ON public.messages CASCADE;
DROP TRIGGER IF EXISTS filter_messages_trigger ON public.messages CASCADE;
DROP TRIGGER IF EXISTS filter_message_content_trigger ON public.messages CASCADE;
DROP TRIGGER IF EXISTS update_conversation_timestamp_trigger ON public.messages CASCADE;

-- Drop functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.trigger_chat_notification() CASCADE;
DROP FUNCTION IF EXISTS public.filter_message_content() CASCADE;
DROP FUNCTION IF EXISTS public.update_conversation_timestamp() CASCADE;

-- Drop chat-related tables
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.booking_messages CASCADE;