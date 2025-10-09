-- Enable realtime for critical tables (with checks to avoid duplicates)
-- This ensures changes are broadcast to subscribed clients immediately

-- Set REPLICA IDENTITY FULL for all tables (safe to repeat)
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.event_requests REPLICA IDENTITY FULL;
ALTER TABLE public.talent_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication (only if not already added)
DO $$
BEGIN
  -- Try to add event_requests to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_requests;
    RAISE NOTICE 'Added event_requests to realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'event_requests already in realtime publication';
  END;

  -- Try to add talent_profiles to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_profiles;
    RAISE NOTICE 'Added talent_profiles to realtime';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'talent_profiles already in realtime publication';
  END;
END $$;

COMMENT ON TABLE public.bookings IS 'Realtime enabled for instant booking updates';
COMMENT ON TABLE public.event_requests IS 'Realtime enabled for instant event request updates';
COMMENT ON TABLE public.talent_profiles IS 'Realtime enabled for instant profile updates';
COMMENT ON TABLE public.notifications IS 'Realtime enabled for instant notification delivery';
COMMENT ON TABLE public.chat_messages IS 'Realtime enabled for instant messaging';