-- Create a secure view for public talent discovery that excludes sensitive fields
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

-- Grant SELECT permissions on the view to authenticated and anonymous users
GRANT SELECT ON public.talent_profiles_public TO authenticated, anon;