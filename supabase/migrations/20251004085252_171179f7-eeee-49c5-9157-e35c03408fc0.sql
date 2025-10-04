-- Update admin_get_all_users function to use 'role' instead of 'user_type'
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
 RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, user_metadata jsonb, user_type text, has_talent_profile boolean, total_bookings integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email::text,
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data as user_metadata,
    COALESCE(p.role, 'booker')::text as user_type, -- Use 'role' column instead of 'user_type'
    EXISTS(SELECT 1 FROM public.talent_profiles tp WHERE tp.user_id = au.id) as has_talent_profile,
    COALESCE((SELECT COUNT(*)::integer FROM public.bookings b WHERE b.user_id = au.id), 0) as total_bookings
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE au.deleted_at IS NULL
  ORDER BY au.created_at DESC;
END;
$function$;