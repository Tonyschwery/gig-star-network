-- Fix search_path for all security definer functions that are missing it
-- Update functions that don't have SET search_path properly configured

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix get_admin_permissions function  
CREATE OR REPLACE FUNCTION public.get_admin_permissions(user_id_param uuid DEFAULT auth.uid())
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix cleanup_chat_messages_on_decline function
CREATE OR REPLACE FUNCTION public.cleanup_chat_messages_on_decline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete chat messages when booking is declined
  IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
    DELETE FROM public.chat_messages WHERE booking_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix cleanup_expired_chat_messages function
CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete chat messages for bookings that are past their event date and completed/declined
  DELETE FROM public.chat_messages 
  WHERE booking_id IN (
    SELECT id FROM public.bookings 
    WHERE event_date < CURRENT_DATE 
    AND status IN ('completed', 'declined')
  );
END;
$$;