-- Fix the subscription status constraint to allow 'active' and set one user as Pro for testing
ALTER TABLE talent_profiles DROP CONSTRAINT IF EXISTS talent_profiles_subscription_status_check;
ALTER TABLE talent_profiles ADD CONSTRAINT talent_profiles_subscription_status_check 
CHECK (subscription_status IN ('free', 'active', 'inactive', 'cancelled'));

-- Now set one user as Pro for testing UI
UPDATE talent_profiles 
SET is_pro_subscriber = true, 
    subscription_status = 'active', 
    subscription_started_at = now()
WHERE artist_name = 'topdjcrate';