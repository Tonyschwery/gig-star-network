-- Create RPC function to completely delete a user (auth + all related data)
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id_to_delete UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Delete all related data first (cascade should handle most, but let's be explicit)
  DELETE FROM public.talent_profiles WHERE user_id = user_id_to_delete;
  DELETE FROM public.bookings WHERE user_id = user_id_to_delete;
  DELETE FROM public.payments WHERE booker_id = user_id_to_delete;
  DELETE FROM public.notifications WHERE user_id = user_id_to_delete;
  DELETE FROM public.chat_messages WHERE sender_id = user_id_to_delete;
  DELETE FROM public.email_preferences WHERE user_id = user_id_to_delete;
  DELETE FROM public.admin_users WHERE user_id = user_id_to_delete;
  
  -- Delete from auth.users (this requires service_role or admin privileges)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN json_build_object('success', true, 'message', 'User deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create RPC function to update subscription status
CREATE OR REPLACE FUNCTION public.admin_update_subscription(talent_id_param UUID, is_pro BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Update talent profile
  UPDATE public.talent_profiles 
  SET 
    is_pro_subscriber = is_pro,
    subscription_status = CASE WHEN is_pro THEN 'active' ELSE 'free' END,
    subscription_started_at = CASE WHEN is_pro THEN COALESCE(subscription_started_at, now()) ELSE NULL END,
    updated_at = now()
  WHERE id = talent_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Talent profile not found');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Subscription updated successfully', 'is_pro', is_pro);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;