-- First, improve the validate_pro_features trigger to be more robust
CREATE OR REPLACE FUNCTION public.validate_pro_features()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only validate on INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Check if user is trying to save Pro features without being Pro
    IF (NEW.gallery_images IS NOT NULL AND array_length(NEW.gallery_images, 1) > 1) OR 
       NEW.soundcloud_link IS NOT NULL OR 
       NEW.youtube_link IS NOT NULL THEN
      
      -- Allow if user is Pro subscriber
      IF NEW.is_pro_subscriber = true THEN
        RETURN NEW;
      END IF;
      
      -- For non-Pro users, limit gallery to 1 image and clear Pro-only links
      IF NEW.gallery_images IS NOT NULL AND array_length(NEW.gallery_images, 1) > 1 THEN
        NEW.gallery_images = CASE 
          WHEN array_length(NEW.gallery_images, 1) > 0 THEN NEW.gallery_images[1:1]
          ELSE '{}'
        END;
      END IF;
      
      NEW.soundcloud_link = NULL;
      NEW.youtube_link = NULL;
      
      -- Log the restriction for debugging
      INSERT INTO admin_notifications (
        admin_user_id,
        notification_type,
        title,
        message,
        related_type,
        related_id
      ) SELECT 
        admin_users.user_id,
        'profile_restriction',
        'Pro Feature Restriction Applied',
        'Non-Pro user attempted to save Pro features - automatically restricted',
        'talent_profile',
        NEW.id
      FROM admin_users
      WHERE is_active = true
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;