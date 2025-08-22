-- Create admin roles table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  permissions TEXT[] NOT NULL DEFAULT ARRAY['all'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.admin_users(user_id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin users table
CREATE POLICY "Only admins can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.admin_users au 
  WHERE au.user_id = auth.uid() AND au.is_active = true
));

CREATE POLICY "Only super admins can manage admin users" 
ON public.admin_users 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.admin_users au 
  WHERE au.user_id = auth.uid() 
  AND au.is_active = true 
  AND 'super_admin' = ANY(au.permissions)
));

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF user_id_param IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = user_id_param 
    AND is_active = true
  );
END;
$$;

-- Create function to get admin permissions
CREATE OR REPLACE FUNCTION public.get_admin_permissions(user_id_param UUID DEFAULT auth.uid())
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_permissions TEXT[];
BEGIN
  IF user_id_param IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  
  SELECT permissions INTO user_permissions
  FROM public.admin_users 
  WHERE user_id = user_id_param 
  AND is_active = true;
  
  RETURN COALESCE(user_permissions, ARRAY[]::TEXT[]);
END;
$$;

-- Insert the first admin user (will need to be updated after user signs up)
-- This is a placeholder - we'll update it once the admin user exists in auth.users