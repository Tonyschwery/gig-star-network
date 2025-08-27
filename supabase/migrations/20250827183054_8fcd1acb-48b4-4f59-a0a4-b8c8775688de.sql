-- Remove old payments table and commission-related functionality
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.gig_applications CASCADE;

-- Update talent_profiles table for new subscription model
ALTER TABLE public.talent_profiles 
DROP COLUMN IF EXISTS stripe_customer_id CASCADE;

-- Add booking request tracking for free tier limits
CREATE TABLE IF NOT EXISTS public.booking_request_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month_year TEXT NOT NULL, -- format: '2024-01'
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS for booking request tracking
ALTER TABLE public.booking_request_tracking ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own tracking
CREATE POLICY "Users can view their own booking request tracking"
ON public.booking_request_tracking
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for system to manage tracking
CREATE POLICY "System can manage booking request tracking"
ON public.booking_request_tracking
FOR ALL
USING (true)
WITH CHECK (true);

-- Add function to check monthly booking limit for free users
CREATE OR REPLACE FUNCTION public.check_booking_limit(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_pro BOOLEAN := FALSE;
  current_month TEXT := to_char(now(), 'YYYY-MM');
  current_count INTEGER := 0;
BEGIN
  -- Check if user is Pro subscriber
  SELECT COALESCE(tp.is_pro_subscriber, FALSE) INTO is_pro
  FROM public.talent_profiles tp
  WHERE tp.user_id = user_id_param;
  
  -- Pro users have unlimited requests
  IF is_pro THEN
    RETURN TRUE;
  END IF;
  
  -- Get current month's request count for free users
  SELECT COALESCE(brt.request_count, 0) INTO current_count
  FROM public.booking_request_tracking brt
  WHERE brt.user_id = user_id_param AND brt.month_year = current_month;
  
  -- Free users limited to 1 request per month
  RETURN current_count < 1;
END;
$$;

-- Add function to increment booking request count
CREATE OR REPLACE FUNCTION public.increment_booking_count(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_month TEXT := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO public.booking_request_tracking (user_id, month_year, request_count)
  VALUES (user_id_param, current_month, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET 
    request_count = booking_request_tracking.request_count + 1,
    updated_at = now();
END;
$$;