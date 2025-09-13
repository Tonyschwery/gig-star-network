-- Create profiles table to track all users (both talents and bookers)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  user_type text DEFAULT 'booker' CHECK (user_type IN ('talent', 'booker', 'admin')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'booker')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Populate profiles table with existing users
INSERT INTO public.profiles (id, email, full_name, user_type)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data ->> 'name',
  COALESCE(u.raw_user_meta_data ->> 'user_type', 'booker')
FROM auth.users u
WHERE u.deleted_at IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  user_type = EXCLUDED.user_type,
  updated_at = now();

-- Update admin_get_all_users function to use profiles table
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
SET search_path = public
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
    COALESCE(p.user_type, 'booker')::text as user_type,
    EXISTS(SELECT 1 FROM public.talent_profiles tp WHERE tp.user_id = au.id) as has_talent_profile,
    COALESCE((SELECT COUNT(*)::integer FROM public.bookings b WHERE b.user_id = au.id), 0) as total_bookings
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE au.deleted_at IS NULL
  ORDER BY au.created_at DESC;
END;
$$;