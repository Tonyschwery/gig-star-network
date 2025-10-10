-- Phase 1: Add provider tracking columns to talent_profiles
ALTER TABLE public.talent_profiles 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paypal' CHECK (provider IN ('paypal', 'manual'));

ALTER TABLE public.talent_profiles 
ADD COLUMN IF NOT EXISTS granted_by_admin_id UUID;

ALTER TABLE public.talent_profiles 
ADD COLUMN IF NOT EXISTS manual_grant_expires_at TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint after column is created (allows NULL values)
ALTER TABLE public.talent_profiles
DROP CONSTRAINT IF EXISTS talent_profiles_granted_by_admin_id_fkey;

ALTER TABLE public.talent_profiles
ADD CONSTRAINT talent_profiles_granted_by_admin_id_fkey 
FOREIGN KEY (granted_by_admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Migrate existing admin-granted Pro users to manual provider (without setting granted_by_admin_id)
UPDATE public.talent_profiles 
SET provider = 'manual',
    manual_grant_expires_at = COALESCE(current_period_end, now() + INTERVAL '1 year')
WHERE paypal_subscription_id LIKE 'admin_%' 
  AND is_pro_subscriber = true;

-- Clear fake PayPal IDs for manual grants
UPDATE public.talent_profiles 
SET paypal_subscription_id = NULL
WHERE provider = 'manual';

-- Create function to revoke manual Pro subscription (admin only)
CREATE OR REPLACE FUNCTION public.admin_revoke_manual_subscription(talent_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  talent_user_id UUID;
  current_provider TEXT;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get talent info
  SELECT user_id, provider INTO talent_user_id, current_provider 
  FROM public.talent_profiles 
  WHERE id = talent_id_param;

  -- Only allow revoking manual grants
  IF current_provider != 'manual' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot revoke PayPal subscriptions via this method');
  END IF;

  -- Remove Pro status
  UPDATE public.talent_profiles 
  SET 
    is_pro_subscriber = false,
    subscription_status = 'free',
    subscription_started_at = NULL,
    current_period_end = NULL,
    plan_id = NULL,
    provider = 'paypal',
    granted_by_admin_id = NULL,
    manual_grant_expires_at = NULL,
    updated_at = now()
  WHERE id = talent_id_param;

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
      'subscription_deactivated',
      'Pro Subscription Revoked',
      'Your manually granted Pro subscription has been revoked by an administrator.',
      now()
    );
  END IF;

  -- Log the action in admin audit
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    details
  ) VALUES (
    auth.uid(),
    'revoke_manual_subscription',
    'talent_profiles',
    talent_id_param,
    json_build_object('talent_user_id', talent_user_id)
  );
  
  RETURN json_build_object('success', true, 'message', 'Manual Pro subscription revoked successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update admin_update_subscription to properly handle manual grants
CREATE OR REPLACE FUNCTION public.admin_update_subscription(talent_id_param UUID, is_pro BOOLEAN)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Update talent profile
  IF is_pro THEN
    -- Grant manual Pro subscription
    UPDATE public.talent_profiles 
    SET 
      is_pro_subscriber = true,
      subscription_status = 'active',
      subscription_started_at = now(),
      current_period_end = now() + INTERVAL '1 year',
      plan_id = 'admin_activated_pro',
      provider = 'manual',
      granted_by_admin_id = auth.uid(),
      manual_grant_expires_at = now() + INTERVAL '1 year',
      paypal_subscription_id = NULL,
      updated_at = now()
    WHERE id = talent_id_param;
  ELSE
    -- Remove Pro status
    UPDATE public.talent_profiles 
    SET 
      is_pro_subscriber = false,
      subscription_status = 'free',
      subscription_started_at = NULL,
      current_period_end = NULL,
      plan_id = NULL,
      provider = 'paypal',
      granted_by_admin_id = NULL,
      manual_grant_expires_at = NULL,
      paypal_subscription_id = NULL,
      updated_at = now()
    WHERE id = talent_id_param;
  END IF;
  
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
        WHEN is_pro THEN 'Your Pro subscription has been granted by an administrator. You now have access to all Pro features including unlimited gallery photos, priority search ranking, and 0% commission fees!'
        ELSE 'Your Pro subscription has been deactivated.'
      END,
      now()
    );
  END IF;

  -- Log the action
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    details
  ) VALUES (
    auth.uid(),
    CASE WHEN is_pro THEN 'grant_manual_subscription' ELSE 'remove_subscription' END,
    'talent_profiles',
    talent_id_param,
    json_build_object('is_pro', is_pro, 'talent_user_id', talent_user_id)
  );
  
  RETURN json_build_object('success', true, 'message', 'Subscription updated successfully', 'is_pro', is_pro, 'provider', 'manual');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Add validation trigger to ensure data consistency
CREATE OR REPLACE FUNCTION public.validate_subscription_provider()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Manual grants should not have PayPal subscription IDs
  IF NEW.provider = 'manual' AND NEW.paypal_subscription_id IS NOT NULL THEN
    RAISE EXCEPTION 'Manual grants cannot have PayPal subscription IDs';
  END IF;

  -- PayPal subscriptions should clear manual grant fields
  IF NEW.provider = 'paypal' AND NEW.is_pro_subscriber = true AND NEW.paypal_subscription_id IS NULL THEN
    NEW.granted_by_admin_id = NULL;
    NEW.manual_grant_expires_at = NULL;
  END IF;

  -- Manual grants should have expiration date
  IF NEW.provider = 'manual' AND NEW.is_pro_subscriber = true AND NEW.manual_grant_expires_at IS NULL THEN
    NEW.manual_grant_expires_at = now() + INTERVAL '1 year';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_subscription_provider_trigger ON public.talent_profiles;

CREATE TRIGGER validate_subscription_provider_trigger
BEFORE INSERT OR UPDATE ON public.talent_profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_subscription_provider();