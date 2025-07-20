-- Add gallery_images column to talent_profiles table
ALTER TABLE public.talent_profiles 
ADD COLUMN gallery_images TEXT[] DEFAULT '{}';

-- Add comment to describe the column
COMMENT ON COLUMN public.talent_profiles.gallery_images IS 'Array of URLs for additional gallery photos (max 5 photos)';