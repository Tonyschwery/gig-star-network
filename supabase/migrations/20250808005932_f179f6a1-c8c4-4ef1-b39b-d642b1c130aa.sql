-- 1) Ensure content filter trigger on messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'messages_apply_filter_trigger'
  ) THEN
    CREATE TRIGGER messages_apply_filter_trigger
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.apply_message_filter();
  END IF;
END$$;

-- 2) Auto-create conversation after a new booking is inserted
CREATE OR REPLACE FUNCTION public.create_conversation_after_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create a conversation if there isn't one already for this booking
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.booking_id = NEW.id
  ) THEN
    INSERT INTO public.conversations (booking_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_conversation_on_booking_insert'
  ) THEN
    CREATE TRIGGER create_conversation_on_booking_insert
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.create_conversation_after_booking();
  END IF;
END$$;

-- 3) Pro-only security enforcement for gig-related chats
-- Conversations: add restrictive policies to gate gig conversations for non-pro talents
DROP POLICY IF EXISTS "Conversations pro gating SELECT" ON public.conversations;
CREATE POLICY "Conversations pro gating SELECT"
ON public.conversations
AS RESTRICTIVE
FOR SELECT
USING (
  -- Allow if not a gig conversation
  gig_application_id IS NULL
  OR
  -- Booker of the gig can always access
  EXISTS (
    SELECT 1 FROM gig_applications ga
    JOIN bookings b ON ga.gig_id = b.id
    WHERE ga.id = conversations.gig_application_id
      AND b.user_id = auth.uid()
  )
  OR
  -- Talent can access only if Pro
  EXISTS (
    SELECT 1 FROM gig_applications ga
    JOIN talent_profiles tp ON ga.talent_id = tp.id
    WHERE ga.id = conversations.gig_application_id
      AND tp.user_id = auth.uid()
      AND tp.subscription_status = 'pro'
  )
);

DROP POLICY IF EXISTS "Conversations pro gating INSERT" ON public.conversations;
CREATE POLICY "Conversations pro gating INSERT"
ON public.conversations
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  -- Allow if not a gig conversation
  gig_application_id IS NULL
  OR
  -- Booker can create
  EXISTS (
    SELECT 1 FROM gig_applications ga
    JOIN bookings b ON ga.gig_id = b.id
    WHERE ga.id = conversations.gig_application_id
      AND b.user_id = auth.uid()
  )
  OR
  -- Talent can create only if Pro
  EXISTS (
    SELECT 1 FROM gig_applications ga
    JOIN talent_profiles tp ON ga.talent_id = tp.id
    WHERE ga.id = conversations.gig_application_id
      AND tp.user_id = auth.uid()
      AND tp.subscription_status = 'pro'
  )
);

-- Messages: add restrictive policies for SELECT and INSERT with the same gating
DROP POLICY IF EXISTS "Messages pro gating SELECT" ON public.messages;
CREATE POLICY "Messages pro gating SELECT"
ON public.messages
AS RESTRICTIVE
FOR SELECT
USING (
  -- Allow if conversation not gig-related
  NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.gig_application_id IS NOT NULL
    -- and user is a non-pro talent participant
    AND EXISTS (
      SELECT 1 FROM gig_applications ga
      JOIN talent_profiles tp ON ga.talent_id = tp.id
      WHERE ga.id = c.gig_application_id
        AND tp.user_id = auth.uid()
        AND tp.subscription_status <> 'pro'
    )
  )
);

DROP POLICY IF EXISTS "Messages pro gating INSERT" ON public.messages;
CREATE POLICY "Messages pro gating INSERT"
ON public.messages
AS RESTRICTIVE
FOR INSERT
WITH CHECK (
  -- Allow if conversation not gig-related
  NOT EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.gig_application_id IS NOT NULL
    -- and user is a non-pro talent participant
    AND EXISTS (
      SELECT 1 FROM gig_applications ga
      JOIN talent_profiles tp ON ga.talent_id = tp.id
      WHERE ga.id = c.gig_application_id
        AND tp.user_id = auth.uid()
        AND tp.subscription_status <> 'pro'
    )
  )
);
