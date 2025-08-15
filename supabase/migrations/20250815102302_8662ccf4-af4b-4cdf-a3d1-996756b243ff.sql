-- Fix Security Definer View issue
-- Drop and recreate the talent_profiles_public view without SECURITY DEFINER

-- First drop the existing view
DROP VIEW IF EXISTS public.talent_profiles_public;

-- Recreate the view without SECURITY DEFINER (defaults to SECURITY INVOKER)
-- This ensures the view uses the permissions of the querying user, not the view creator
CREATE VIEW public.talent_profiles_public AS
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

-- Add comment explaining the security model
COMMENT ON VIEW public.talent_profiles_public IS 'Public view of talent profiles - uses SECURITY INVOKER to respect querying user permissions';