-- Fix security warning: Set proper search_path for function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;