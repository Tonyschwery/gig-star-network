-- Update admin subscription function to fully activate all Pro benefits
CREATE OR REPLACE FUNCTION public.admin_update_subscription(talent_id_param uuid, is_pro boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  talent_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get talent user_id for notification
  SELECT user_id INTO talent_user_id FROM public.talent_profiles WHERE id = talent_id_param;

  -- Update talent profile with full Pro benefits
  UPDATE public.talent_profiles 
  SET 
    is_pro_subscriber = is_pro,
    subscription_status = CASE WHEN is_pro THEN 'active' ELSE 'free' END,
    subscription_started_at = CASE 
      WHEN is_pro THEN COALESCE(subscription_started_at, now()) 
      ELSE NULL 
    END,
    current_period_end = CASE 
      WHEN is_pro THEN now() + INTERVAL '1 year'
      ELSE NULL 
    END,
    plan_id = CASE 
      WHEN is_pro THEN 'admin_activated_pro'
      ELSE NULL 
    END,
    paypal_subscription_id = CASE 
      WHEN is_pro THEN 'admin_' || gen_random_uuid()::text
      ELSE NULL 
    END,
    updated_at = now()
  WHERE id = talent_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Talent profile not found');
  END IF;

  -- Create notification for the talent user
  IF talent_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      created_at
    ) VALUES (
      talent_user_id,
      CASE WHEN is_pro THEN 'subscription_activated' ELSE 'subscription_deactivated' END,
      CASE WHEN is_pro THEN 'Pro Subscription Activated!' ELSE 'Pro Subscription Deactivated' END,
      CASE 
        WHEN is_pro THEN 'Your Pro subscription has been activated by admin. You now have access to all Pro features including unlimited gallery photos, priority search ranking, and 0% commission fees!'
        ELSE 'Your Pro subscription has been deactivated.'
      END,
      now()
    );
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Subscription updated successfully', 'is_pro', is_pro);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$