-- Continue fixing all security definer functions with missing search_path

-- Fix admin_delete_user function
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id_to_delete uuid)
RETURNS json
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
$$;

-- Fix admin_send_direct_message function
CREATE OR REPLACE FUNCTION public.admin_send_direct_message(target_user_id uuid, message_content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_support_booking_id uuid;
  message_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get or create admin support booking for this user
  SELECT id INTO admin_support_booking_id
  FROM public.bookings 
  WHERE user_id = target_user_id 
    AND event_type = 'admin_support'
    AND talent_id IS NULL;

  -- Create admin support booking if it doesn't exist
  IF admin_support_booking_id IS NULL THEN
    INSERT INTO public.bookings (
      user_id,
      talent_id,
      event_type,
      event_location,
      event_address,
      event_date,
      event_duration,
      booker_name,
      booker_email,
      status,
      description
    ) VALUES (
      target_user_id,
      NULL,
      'admin_support',
      'Online',
      'QTalents Support Chat',
      CURRENT_DATE + INTERVAL '30 days',
      60,
      'Support Request',
      '',
      'confirmed',
      'Direct communication channel with QTalents support team'
    ) RETURNING id INTO admin_support_booking_id;
  END IF;

  -- Send the message from admin
  INSERT INTO public.chat_messages (
    booking_id,
    sender_id,
    content
  ) VALUES (
    admin_support_booking_id,
    auth.uid(),
    message_content
  ) RETURNING id INTO message_id;

  RETURN message_id;
END;
$$;

-- Fix admin_update_subscription function
CREATE OR REPLACE FUNCTION public.admin_update_subscription(talent_id_param uuid, is_pro boolean)
RETURNS json
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