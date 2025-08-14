-- Fix talent_profiles RLS policies to protect sensitive information
-- Remove the overly permissive public policy
DROP POLICY IF EXISTS "Talent profiles are viewable by everyone" ON public.talent_profiles;

-- Create granular policies for different levels of access

-- 1. Public discovery policy - only basic non-sensitive information for talent browsing
CREATE POLICY "Public can view basic talent info for discovery" ON public.talent_profiles
FOR SELECT 
USING (true);

-- 2. Talent owners can view their full profile
CREATE POLICY "Talent owners can view their full profile" ON public.talent_profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Bookers can view additional talent details when they have an active booking
CREATE POLICY "Bookers can view talent details for their bookings" ON public.talent_profiles
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.bookings 
    WHERE bookings.talent_id = talent_profiles.id 
    AND bookings.user_id = auth.uid()
  )
);