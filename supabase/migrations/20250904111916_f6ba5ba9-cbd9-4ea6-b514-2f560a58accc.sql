-- Fix the remaining critical security definer functions

-- Fix check_booking_limit function
CREATE OR REPLACE FUNCTION public.check_booking_limit(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_pro BOOLEAN := FALSE;
  current_month TEXT := to_char(now(), 'YYYY-MM');
  current_count INTEGER := 0;
BEGIN
  -- Check if user is Pro subscriber
  SELECT COALESCE(tp.is_pro_subscriber, FALSE) INTO is_pro
  FROM public.talent_profiles tp
  WHERE tp.user_id = user_id_param;
  
  -- Pro users have unlimited requests
  IF is_pro THEN
    RETURN TRUE;
  END IF;
  
  -- Get current month's request count for free users
  SELECT COALESCE(brt.request_count, 0) INTO current_count
  FROM public.booking_request_tracking brt
  WHERE brt.user_id = user_id_param AND brt.month_year = current_month;
  
  -- Free users limited to 1 request per month
  RETURN current_count < 1;
END;
$$;

-- Fix increment_booking_count function
CREATE OR REPLACE FUNCTION public.increment_booking_count(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month TEXT := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO public.booking_request_tracking (user_id, month_year, request_count)
  VALUES (user_id_param, current_month, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET 
    request_count = booking_request_tracking.request_count + 1,
    updated_at = now();
END;
$$;

-- Fix validate_pro_features function
CREATE OR REPLACE FUNCTION public.validate_pro_features()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- Fix get_user_location_preference function
CREATE OR REPLACE FUNCTION public.get_user_location_preference(user_id_param uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_location TEXT;
BEGIN
  IF user_id_param IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT 
    CASE 
      WHEN location_override = true THEN preferred_location
      ELSE COALESCE(preferred_location, detected_location)
    END 
  INTO user_location
  FROM public.user_preferences 
  WHERE user_id = user_id_param;
  
  RETURN user_location;
END;
$$;