-- Add support for public booking requests
ALTER TABLE public.bookings 
ADD COLUMN is_public_request boolean DEFAULT false,
ADD COLUMN is_gig_opportunity boolean DEFAULT false;

-- Create index for better performance when querying public requests
CREATE INDEX idx_bookings_public_requests ON public.bookings(is_public_request, is_gig_opportunity) WHERE is_public_request = true;

-- Update RLS policy to allow pro talents to view public requests
CREATE POLICY "Pro talents can view public gig opportunities" 
ON public.bookings 
FOR SELECT 
USING (
  is_public_request = true 
  AND is_gig_opportunity = true 
  AND EXISTS (
    SELECT 1 
    FROM talent_profiles 
    WHERE talent_profiles.user_id = auth.uid() 
    AND talent_profiles.is_pro_subscriber = true
  )
);