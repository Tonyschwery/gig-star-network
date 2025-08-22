-- Fix the infinite recursion issue in admin_users RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Only admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only super admins can manage admin users" ON public.admin_users;

-- Create new policies using the security definer functions to avoid recursion
CREATE POLICY "Only admins can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only super admins can manage admin users" 
ON public.admin_users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true 
    AND 'super_admin'::text = ANY(au.permissions)
  )
);

-- Also ensure the RPC functions have proper permissions
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription TO authenticated;