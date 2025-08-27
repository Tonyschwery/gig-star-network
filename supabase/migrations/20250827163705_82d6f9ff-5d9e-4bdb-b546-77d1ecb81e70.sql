-- Update admin user creation function to check for qtalentslive@gmail.com
CREATE OR REPLACE FUNCTION public.handle_admin_user_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the new user's email is the admin email
  IF NEW.email = 'qtalentslive@gmail.com' THEN
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
$function$