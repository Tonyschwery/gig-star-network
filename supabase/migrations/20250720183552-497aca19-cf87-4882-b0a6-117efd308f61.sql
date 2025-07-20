-- Add subscription status to talent_profiles table
ALTER TABLE public.talent_profiles 
ADD COLUMN is_pro_subscriber boolean NOT NULL DEFAULT false;

-- Add subscription date tracking
ALTER TABLE public.talent_profiles 
ADD COLUMN subscription_started_at timestamp with time zone DEFAULT null;

-- Update the update trigger to handle the new columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;