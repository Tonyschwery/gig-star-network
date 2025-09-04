-- Fix the search path security warning for admin_get_all_users function
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
    au.raw_user_meta_data,
    COALESCE(au.raw_user_meta_data ->> 'user_type', 'booker')::text,
    EXISTS(SELECT 1 FROM public.talent_profiles tp WHERE tp.user_id = au.id),
    COALESCE((SELECT COUNT(*)::integer FROM public.bookings b WHERE b.user_id = au.id), 0)
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;