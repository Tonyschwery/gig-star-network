-- Remove chat-related functions and tables for ephemeral realtime chat migration
-- Drop functions that depend on conversations/messages first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_conversation_after_booking') THEN
    DROP FUNCTION public.create_conversation_after_booking CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'filter_message_content') THEN
    DROP FUNCTION public.filter_message_content CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_message_filter') THEN
    DROP FUNCTION public.apply_message_filter CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'mark_conversation_messages_read') THEN
    DROP FUNCTION public.mark_conversation_messages_read(uuid, uuid) CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_unread_message_count') THEN
    DROP FUNCTION public.get_unread_message_count(uuid) CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_message_received') THEN
    DROP FUNCTION public.notify_message_received() CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- proceed even if some don't exist
  NULL;
END $$;

-- Drop tables in correct order (messages references conversations)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    DROP TABLE public.messages CASCADE;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'conversations'
  ) THEN
    DROP TABLE public.conversations CASCADE;
  END IF;
END $$;
