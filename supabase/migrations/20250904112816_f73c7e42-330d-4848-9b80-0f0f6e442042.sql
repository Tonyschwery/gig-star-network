-- Fix admin_get_all_users function to properly return all user data
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  id uuid, 
  email text, 
  created_at timestamp with time zone, 
  last_sign_in_at timestamp with time zone, 
  user_metadata jsonb, 
  user_type text, 
  has_talent_profile boolean, 
  total_bookings integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data as user_metadata,
    COALESCE(au.raw_user_meta_data ->> 'user_type', 'booker')::text as user_type,
    EXISTS(SELECT 1 FROM public.talent_profiles tp WHERE tp.user_id = au.id) as has_talent_profile,
    COALESCE((SELECT COUNT(*)::integer FROM public.bookings b WHERE b.user_id = au.id), 0) as total_bookings
  FROM auth.users au
  WHERE au.deleted_at IS NULL
  ORDER BY au.created_at DESC;
END;
$$;

-- Fix update_updated_at_column to include search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix check_talent_booking_limit function
CREATE OR REPLACE FUNCTION public.check_talent_booking_limit(talent_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_pro BOOLEAN := FALSE;
  current_month_start DATE := date_trunc('month', CURRENT_DATE);
  current_month_end DATE := date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
  accepted_count INTEGER := 0;
BEGIN
  -- Check if talent is Pro subscriber
  SELECT COALESCE(tp.is_pro_subscriber, FALSE) INTO is_pro
  FROM public.talent_profiles tp
  WHERE tp.id = talent_id_param;
  
  -- Pro talents have unlimited bookings
  IF is_pro THEN
    RETURN TRUE;
  END IF;
  
  -- Count ACCEPTED bookings for this talent in current month
  SELECT COUNT(*) INTO accepted_count
  FROM public.bookings b
  WHERE b.talent_id = talent_id_param 
    AND b.status = 'accepted'
    AND b.event_date >= current_month_start
    AND b.event_date <= current_month_end;
  
  -- Free talents limited to 1 accepted booking per month
  RETURN accepted_count < 1;
END;
$$;

-- Fix get_talent_accepted_bookings_count function
CREATE OR REPLACE FUNCTION public.get_talent_accepted_bookings_count(talent_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month_start DATE := date_trunc('month', CURRENT_DATE);
  current_month_end DATE := date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
  accepted_count INTEGER := 0;
BEGIN
  -- Count ACCEPTED bookings for this talent in current month
  SELECT COUNT(*) INTO accepted_count
  FROM public.bookings b
  WHERE b.talent_id = talent_id_param 
    AND b.status = 'accepted'
    AND b.event_date >= current_month_start
    AND b.event_date <= current_month_end;
  
  RETURN accepted_count;
END;
$$;