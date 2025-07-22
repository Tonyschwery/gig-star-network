-- Update RLS policy to allow talents to message public gig opportunities
DROP POLICY IF EXISTS "Users can create messages for their bookings" ON public.booking_messages;

CREATE POLICY "Users can create messages for their bookings" 
ON public.booking_messages 
FOR INSERT 
WITH CHECK (
  (auth.uid() = sender_id) AND 
  (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_messages.booking_id 
      AND (
        -- User is the original booker
        (b.user_id = auth.uid()) OR 
        -- User is the assigned talent
        (b.talent_id IN (
          SELECT tp.id FROM talent_profiles tp 
          WHERE tp.user_id = auth.uid()
        )) OR
        -- This is a public gig opportunity and user is a talent (has a talent profile)
        (b.is_public_request = true AND b.is_gig_opportunity = true AND 
         EXISTS (
           SELECT 1 FROM talent_profiles tp 
           WHERE tp.user_id = auth.uid()
         )
        )
      )
    )
  )
);

-- Also update the SELECT policy to allow talents to view messages for public gigs
DROP POLICY IF EXISTS "Users can view messages for their bookings" ON public.booking_messages;

CREATE POLICY "Users can view messages for their bookings" 
ON public.booking_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_messages.booking_id 
    AND (
      -- User is the original booker
      (b.user_id = auth.uid()) OR 
      -- User is the assigned talent
      (b.talent_id IN (
        SELECT tp.id FROM talent_profiles tp 
        WHERE tp.user_id = auth.uid()
      )) OR
      -- This is a public gig opportunity and user is a talent (has a talent profile)
      (b.is_public_request = true AND b.is_gig_opportunity = true AND 
       EXISTS (
         SELECT 1 FROM talent_profiles tp 
         WHERE tp.user_id = auth.uid()
       )
      )
    )
  )
);