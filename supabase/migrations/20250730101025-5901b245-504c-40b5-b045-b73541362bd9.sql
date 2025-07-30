-- Fix #2: Drop the old flawed conversations RLS policy and create a new correct one

-- Drop the old policy that was blocking bookers
DROP POLICY IF EXISTS "Users can create conversations for their bookings or gigs" ON public.conversations;

-- Create new policy for gig conversations that allows both participants
CREATE POLICY "Gig participants can create conversations" ON public.conversations
FOR INSERT WITH CHECK (
  gig_application_id IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM gig_applications ga
    JOIN bookings g ON ga.gig_id = g.id
    JOIN talent_profiles tp ON ga.talent_id = tp.id
    WHERE ga.id = conversations.gig_application_id
      AND (
        auth.uid() = g.user_id  -- Booker who created the gig
        OR
        auth.uid() = tp.user_id  -- Talent who applied
      )
  )
);

-- Create policy for regular booking conversations (if doesn't exist)
CREATE POLICY "Booking participants can create conversations" ON public.conversations
FOR INSERT WITH CHECK (
  booking_id IS NOT NULL AND
  gig_application_id IS NULL AND
  EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.id = conversations.booking_id
      AND (
        b.user_id = auth.uid()  -- Booker
        OR
        EXISTS (
          SELECT 1 
          FROM talent_profiles tp 
          WHERE tp.id = b.talent_id AND tp.user_id = auth.uid()  -- Talent
        )
      )
  )
);