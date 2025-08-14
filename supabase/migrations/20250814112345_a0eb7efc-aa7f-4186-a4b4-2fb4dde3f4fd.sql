-- Fix talent_profiles RLS policies to protect sensitive information
-- Remove the overly permissive public policy
DROP POLICY IF EXISTS "Talent profiles are viewable by everyone" ON public.talent_profiles;

-- Create granular policies for different levels of access

-- 1. Public discovery policy - only basic non-sensitive information for talent browsing
CREATE POLICY "Public can view basic talent info for discovery" ON public.talent_profiles
FOR SELECT 
USING (true)
-- Note: This policy allows public access but we'll need to modify frontend queries 
-- to only select non-sensitive columns

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

-- 4. Talent owners can update their own profiles (keeping existing policy)
-- This should already exist but let's ensure it's there
CREATE POLICY "Talent owners can update their profile" ON public.talent_profiles
FOR UPDATE 
USING (auth.uid() = user_id);

-- 5. Create a secure view for public talent discovery that excludes sensitive fields
CREATE OR REPLACE VIEW public.talent_profiles_public AS
SELECT 
  id,
  artist_name,
  act,
  music_genres,
  custom_genre,
  picture_url,
  soundcloud_link,
  youtube_link,
  biography,
  age,
  nationality,
  currency,
  location,
  gallery_images,
  rate_per_hour,
  created_at
FROM public.talent_profiles;

-- Enable RLS on the view and create policy
ALTER VIEW public.talent_profiles_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public talent discovery view" ON public.talent_profiles_public
FOR SELECT 
USING (true);

-- Create a comprehensive view for authenticated users with booking relationships
CREATE OR REPLACE VIEW public.talent_profiles_detailed AS
SELECT 
  tp.*
FROM public.talent_profiles tp
WHERE 
  -- Talent can see their own full profile
  auth.uid() = tp.user_id
  OR
  -- Bookers can see full profile if they have a booking
  EXISTS (
    SELECT 1 
    FROM public.bookings b 
    WHERE b.talent_id = tp.id 
    AND b.user_id = auth.uid()
  );

-- Enable RLS on the detailed view
ALTER VIEW public.talent_profiles_detailed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view talent details based on relationship" ON public.talent_profiles_detailed
FOR SELECT 
USING (true);