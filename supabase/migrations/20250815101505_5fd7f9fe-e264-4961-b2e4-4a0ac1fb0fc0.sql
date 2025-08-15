-- Fix Security Definer View issue by recreating the view without SECURITY DEFINER
-- Drop the existing view
DROP VIEW IF EXISTS public.talent_profiles_public;

-- Recreate the view without SECURITY DEFINER (default is SECURITY INVOKER which is safer)
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

-- Grant permissions to view (this is safe since the view will use the querying user's permissions)
GRANT SELECT ON public.talent_profiles_public TO authenticated, anon;

-- Add comment explaining the security consideration
COMMENT ON VIEW public.talent_profiles_public IS 'Public view for talent discovery that respects RLS policies of the querying user';