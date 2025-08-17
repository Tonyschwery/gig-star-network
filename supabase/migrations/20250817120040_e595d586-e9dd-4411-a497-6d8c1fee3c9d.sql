-- Fix infinite recursion in RLS policies and missing columns

-- First, fix the talent_profiles_public view to include missing column
DROP VIEW IF EXISTS talent_profiles_public;

CREATE VIEW talent_profiles_public AS
SELECT 
    id,
    artist_name,
    act,
    gender,
    age,
    nationality,
    currency,
    location,
    rate_per_hour,
    music_genres,
    custom_genre,
    picture_url,
    gallery_images,
    soundcloud_link,
    youtube_link,
    biography,
    created_at,
    is_pro_subscriber -- Add missing column
FROM talent_profiles;

-- Fix the recursive RLS policy issue by simplifying policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Talent owners can view their full profile" ON talent_profiles;
DROP POLICY IF EXISTS "Bookers can view talent details for their bookings" ON talent_profiles;

-- Create new simplified policies that avoid recursion
CREATE POLICY "Talent owners can view their own profile"
ON talent_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Public view for talent discovery"
ON talent_profiles
FOR SELECT
TO authenticated
USING (true);

-- Ensure talent_profiles_public has proper RLS (should be readable by all)
ALTER VIEW talent_profiles_public OWNER TO postgres;
GRANT SELECT ON talent_profiles_public TO authenticated;
GRANT SELECT ON talent_profiles_public TO anon;