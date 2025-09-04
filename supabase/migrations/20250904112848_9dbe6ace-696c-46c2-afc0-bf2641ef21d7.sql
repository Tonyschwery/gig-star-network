-- Fix remaining functions that need search_path
CREATE OR REPLACE FUNCTION public.user_has_talent_profile(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Return false if no user_id provided
    IF user_id_param IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has a talent profile
    SELECT EXISTS(
        SELECT 1 
        FROM public.talent_profiles 
        WHERE user_id = user_id_param
    ) INTO profile_exists;
    
    RETURN profile_exists;
EXCEPTION
    WHEN OTHERS THEN
        -- On any error, return false (don't show profile exists)
        -- This prevents errors from defaulting to "show onboarding"
        RETURN FALSE;
END;
$$;

-- Fix get_user_talent_profile function
CREATE OR REPLACE FUNCTION public.get_user_talent_profile(user_id_param uuid DEFAULT auth.uid())
RETURNS TABLE(id uuid, artist_name text, act text, rate_per_hour numeric, currency text, subscription_status text, is_pro_subscriber boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Return empty result if no user_id provided
    IF user_id_param IS NULL THEN
        RETURN;
    END IF;
    
    -- Return the user's own profile data
    RETURN QUERY
    SELECT 
        tp.id,
        tp.artist_name,
        tp.act::TEXT,
        tp.rate_per_hour,
        tp.currency,
        tp.subscription_status,
        tp.is_pro_subscriber
    FROM public.talent_profiles tp
    WHERE tp.user_id = user_id_param;
END;
$$;

-- Fix handle_admin_user_creation function
CREATE OR REPLACE FUNCTION public.handle_admin_user_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the new user's email is one of the admin emails
  IF NEW.email = 'qtalentslive@gmail.com' OR NEW.email = 'admin@qtalent.live' THEN
    -- Insert the user as an admin with full permissions
    INSERT INTO public.admin_users (
      user_id,
      role,
      permissions,
      is_active
    ) VALUES (
      NEW.id,
      'super_admin',
      ARRAY['all', 'super_admin'],
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix handle_new_user_admin_support function
CREATE OR REPLACE FUNCTION public.handle_new_user_admin_support()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create admin support booking for every new user
  INSERT INTO public.bookings (
    user_id,
    talent_id,
    event_type,
    event_location,
    event_address,
    event_date,
    event_duration,
    booker_name,
    booker_email,
    status,
    description
  ) VALUES (
    NEW.id,
    NULL,
    'admin_support',
    'Online',
    'QTalents Support Chat',
    CURRENT_DATE + INTERVAL '30 days',
    60,
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'User') || ' Support',
    NEW.email,
    'confirmed',
    'Direct communication channel with QTalents support team'
  );
  
  RETURN NEW;
END;
$$;