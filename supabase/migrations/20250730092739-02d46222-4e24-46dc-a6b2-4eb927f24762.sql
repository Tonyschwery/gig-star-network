-- Update conversations table to support gig applications
ALTER TABLE public.conversations 
ADD COLUMN gig_application_id UUID REFERENCES public.gig_applications(id) ON DELETE CASCADE;

-- Update conversations policies to handle gig applications
DROP POLICY IF EXISTS "Users can create conversations for their bookings or gigs" ON public.conversations;

CREATE POLICY "Users can create conversations for their bookings or gigs" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  -- For regular bookings
  (booking_id IS NOT NULL AND gig_application_id IS NULL AND EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = conversations.booking_id 
    AND (
      (NOT b.is_gig_opportunity AND (
        b.user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM talent_profiles tp WHERE tp.id = b.talent_id AND tp.user_id = auth.uid())
      )) 
      OR 
      (b.is_gig_opportunity = true AND b.is_public_request = true AND EXISTS (
        SELECT 1 FROM talent_profiles tp 
        WHERE tp.user_id = auth.uid() AND tp.is_pro_subscriber = true
      ))
    )
  ))
  OR
  -- For gig applications
  (gig_application_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM gig_applications ga
    JOIN talent_profiles tp ON ga.talent_id = tp.id
    WHERE ga.id = conversations.gig_application_id 
    AND tp.user_id = auth.uid()
  ))
);

-- Update SELECT policy for conversations to include gig applications
DROP POLICY IF EXISTS "Users can view conversations for their bookings" ON public.conversations;

CREATE POLICY "Users can view conversations for their bookings" 
ON public.conversations 
FOR SELECT 
USING (
  -- For regular bookings
  (booking_id IS NOT NULL AND gig_application_id IS NULL AND EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = conversations.booking_id 
    AND (
      b.user_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM talent_profiles tp WHERE tp.id = b.talent_id AND tp.user_id = auth.uid())
    )
  ))
  OR
  -- For gig applications
  (gig_application_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM gig_applications ga
    JOIN bookings b ON ga.gig_id = b.id
    JOIN talent_profiles tp ON ga.talent_id = tp.id
    WHERE ga.id = conversations.gig_application_id 
    AND (b.user_id = auth.uid() OR tp.user_id = auth.uid())
  ))
);