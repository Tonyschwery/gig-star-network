-- Fix admin_delete_user function by removing non-existent payments table reference
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  DELETE FROM public.notifications WHERE user_id = user_id_to_delete;
  DELETE FROM public.chat_messages WHERE sender_id = user_id_to_delete;
  DELETE FROM public.email_preferences WHERE user_id = user_id_to_delete;
  DELETE FROM public.admin_users WHERE user_id = user_id_to_delete;
  DELETE FROM public.event_requests WHERE user_id = user_id_to_delete;
  DELETE FROM public.booking_request_tracking WHERE user_id = user_id_to_delete;
  
  -- Delete from auth.users (this requires service_role or admin privileges)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN json_build_object('success', true, 'message', 'User deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- Add reply functionality to event_requests table
ALTER TABLE public.event_requests ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.event_requests ADD COLUMN IF NOT EXISTS replied_at timestamp with time zone;
ALTER TABLE public.event_requests ADD COLUMN IF NOT EXISTS replied_by uuid;