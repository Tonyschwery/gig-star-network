-- Add new fields to talent_profiles table for rate, currency, and location
ALTER TABLE public.talent_profiles 
ADD COLUMN rate_per_hour DECIMAL(10,2),
ADD COLUMN currency TEXT DEFAULT 'USD',
ADD COLUMN location TEXT;