-- Create function to handle admin user creation
CREATE OR REPLACE FUNCTION public.handle_admin_user_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if the new user's email is the admin email
  IF NEW.email = 'qtalents@proton.me' THEN
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

-- Create trigger to automatically create admin user
CREATE TRIGGER on_admin_user_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_user_creation();

-- Update the admin authentication redirect in useAuth hook to handle admin users
-- This will be done in the code updates