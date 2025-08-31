-- Add RLS policies to prevent Pro feature bypass
-- Create policy to prevent non-Pro users from saving Pro features

-- Add validation trigger for Pro-only fields
CREATE OR REPLACE FUNCTION public.validate_pro_features()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate on INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Check if user is trying to save Pro features without being Pro
    IF (NEW.gallery_images IS NOT NULL AND array_length(NEW.gallery_images, 1) > 0) OR 
       NEW.soundcloud_link IS NOT NULL OR 
       NEW.youtube_link IS NOT NULL THEN
      
      -- Allow if user is Pro subscriber
      IF NEW.is_pro_subscriber = true THEN
        RETURN NEW;
      END IF;
      
      -- For non-Pro users, clear Pro-only fields
      NEW.gallery_images = '{}';
      NEW.soundcloud_link = NULL;
      NEW.youtube_link = NULL;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate Pro features
DROP TRIGGER IF EXISTS validate_pro_features_trigger ON public.talent_profiles;
CREATE TRIGGER validate_pro_features_trigger
  BEFORE INSERT OR UPDATE ON public.talent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pro_features();