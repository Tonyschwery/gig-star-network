-- Emergency fix: Activate Pro subscription for user who paid but webhook failed
UPDATE public.talent_profiles 
SET 
  is_pro_subscriber = true,
  subscription_status = 'active',
  subscription_started_at = COALESCE(subscription_started_at, now()),
  updated_at = now()
WHERE user_id = '32aae0aa-3247-415c-8d63-9458d4131abe' 
  AND is_pro_subscriber = false;