-- Clean up old sandbox subscription data to fix PayPal conflicts
UPDATE talent_profiles 
SET 
  paypal_subscription_id = NULL,
  plan_id = NULL,
  is_pro_subscriber = false,
  subscription_status = 'free',
  subscription_started_at = NULL,
  current_period_end = NULL
WHERE paypal_subscription_id IS NOT NULL 
  AND (plan_id LIKE 'P-5DD%' OR plan_id LIKE 'P-8R7%'); -- Remove old sandbox plan IDs

-- Add index for better performance on subscription queries
CREATE INDEX IF NOT EXISTS idx_talent_profiles_subscription 
ON talent_profiles(paypal_subscription_id, subscription_status) 
WHERE paypal_subscription_id IS NOT NULL;