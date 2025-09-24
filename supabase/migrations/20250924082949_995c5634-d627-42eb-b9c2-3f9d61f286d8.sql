-- Drop the problematic function and trigger that's causing signup errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Ensure the correct trigger and function are in place for user profile creation
-- The handle_new_user_profile() function should already exist and work correctly
-- Let's make sure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();