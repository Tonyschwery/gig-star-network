-- Fix infinite recursion in admin_users RLS policies
-- The issue is that is_admin() function queries admin_users table, creating recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can manage all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;

-- Create simpler, non-recursive policies
-- Allow service role to manage admin_users (for system operations)
CREATE POLICY "Service role can manage admin users" 
ON public.admin_users 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow authenticated users to view admin_users (needed for is_admin function)
-- This avoids recursion by not calling is_admin() within the policy
CREATE POLICY "Authenticated users can view admin users" 
ON public.admin_users 
FOR SELECT 
TO authenticated 
USING (true);

-- Only allow updates/inserts/deletes for users with specific admin email
CREATE POLICY "Admin email can manage all admin users" 
ON public.admin_users 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'qtalents@proton.me') 
WITH CHECK (auth.jwt() ->> 'email' = 'qtalents@proton.me');