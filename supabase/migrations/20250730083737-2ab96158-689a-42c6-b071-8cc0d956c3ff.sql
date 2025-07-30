-- Fix RLS policy for conversations table to support both bookings and gigs
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "System can create conversations" ON public.conversations;

-- Create a new flexible policy that allows conversation creation for both direct bookings and gigs
CREATE POLICY "Users can create conversations for their bookings or gigs" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.bookings b 
    WHERE b.id = conversations.booking_id 
    AND (
      -- Direct booking: user is the booker OR talent
      (NOT b.is_gig_opportunity AND (
        b.user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 
          FROM public.talent_profiles tp 
          WHERE tp.id = b.talent_id AND tp.user_id = auth.uid()
        )
      ))
      OR
      -- Gig opportunity: user is a Pro talent interacting with the gig
      (b.is_gig_opportunity = true AND b.is_public_request = true AND 
        EXISTS (
          SELECT 1 
          FROM public.talent_profiles tp 
          WHERE tp.user_id = auth.uid() AND tp.is_pro_subscriber = true
        )
      )
    )
  )
);