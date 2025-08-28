-- Add PayPal subscription columns to talent_profiles table
-- talent_profiles is the primary user profiles table linked to auth.users

-- Add missing columns for PayPal subscription integration
ALTER TABLE public.talent_profiles 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Note: subscription_status already exists with default 'free'
-- If you need it to be 'inactive' instead, uncomment the line below:
-- ALTER TABLE public.talent_profiles ALTER COLUMN subscription_status SET DEFAULT 'inactive';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_talent_profiles_paypal_subscription_id ON public.talent_profiles(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_talent_profiles_plan_id ON public.talent_profiles(plan_id);