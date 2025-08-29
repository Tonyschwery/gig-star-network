-- Set one user as Pro for testing UI
UPDATE talent_profiles 
SET is_pro_subscriber = true, 
    subscription_status = 'active', 
    subscription_started_at = now()
WHERE artist_name = 'topdjcrate';

-- Also fix webhook verification issues by updating PayPal webhook function
-- We'll create a simpler test version of the activation