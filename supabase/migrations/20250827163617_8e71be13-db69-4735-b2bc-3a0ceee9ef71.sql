-- Update admin user creation function to check for qtalentslive@gmail.com
DROP FUNCTION IF EXISTS public.handle_admin_user_creation();

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

-- Create admin user record for qtalentslive@gmail.com if it exists in auth.users
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find the user ID for qtalentslive@gmail.com in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'qtalentslive@gmail.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Insert admin record if it doesn't exist
        INSERT INTO public.admin_users (
            user_id,
            role,
            permissions,
            is_active
        ) VALUES (
            admin_user_id,
            'super_admin',
            ARRAY['all', 'super_admin'],
            true
        )
        ON CONFLICT (user_id) DO UPDATE SET
            role = 'super_admin',
            permissions = ARRAY['all', 'super_admin'],
            is_active = true,
            updated_at = now();
    END IF;
END $$;