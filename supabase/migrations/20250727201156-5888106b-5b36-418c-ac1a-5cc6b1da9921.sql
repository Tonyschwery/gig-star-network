-- Clean and reset database - Remove all data and Stripe references

-- First, clean all existing data
TRUNCATE TABLE public.booking_messages CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
TRUNCATE TABLE public.talent_profiles CASCADE;
TRUNCATE TABLE public.email_preferences CASCADE;
TRUNCATE TABLE public.admin_settings CASCADE;

-- Clean storage buckets (remove all files)
DELETE FROM storage.objects WHERE bucket_id = 'talent-pictures';

-- Drop any Stripe-related columns if they exist (these might not exist, but we'll try)
ALTER TABLE public.payments DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS stripe_invoice_id;

-- Ensure payments table has the right structure for manual invoices
ALTER TABLE public.payments 
  ALTER COLUMN payment_method SET DEFAULT 'manual_invoice',
  ALTER COLUMN payment_status SET DEFAULT 'pending';

-- Add a function to mark payments as completed (for manual payment processing)
CREATE OR REPLACE FUNCTION public.complete_manual_payment(payment_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record RECORD;
  booking_record RECORD;
  result JSON;
BEGIN
  -- Get payment details
  SELECT * INTO payment_record FROM public.payments WHERE id = payment_id_param;
  
  IF payment_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Payment not found');
  END IF;
  
  -- Update payment status to completed
  UPDATE public.payments 
  SET payment_status = 'completed', 
      processed_at = now(),
      updated_at = now()
  WHERE id = payment_id_param;
  
  -- Get booking details
  SELECT * INTO booking_record FROM public.bookings WHERE id = payment_record.booking_id;
  
  -- Update booking status to completed if payment is successful
  UPDATE public.bookings 
  SET status = 'completed',
      updated_at = now()
  WHERE id = payment_record.booking_id;
  
  -- Create notifications for payment completion
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    booking_id
  ) VALUES (
    booking_record.user_id,
    'payment_completed',
    'Payment Completed',
    'Your payment has been processed and the booking is now complete.',
    booking_record.id
  );
  
  -- Notify talent if assigned
  IF booking_record.talent_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      booking_id
    ) 
    SELECT 
      tp.user_id,
      'payment_completed',
      'Payment Received',
      'Payment has been completed for your booking.',
      booking_record.id
    FROM public.talent_profiles tp 
    WHERE tp.id = booking_record.talent_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'payment_id', payment_id_param,
    'booking_id', payment_record.booking_id,
    'amount', payment_record.total_amount
  );
END;
$$;

-- Create a simple function to get payment status
CREATE OR REPLACE FUNCTION public.get_payment_status(booking_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record RECORD;
  result JSON;
BEGIN
  SELECT * INTO payment_record 
  FROM public.payments 
  WHERE booking_id = booking_id_param 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF payment_record IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;
  
  RETURN json_build_object(
    'found', true,
    'payment_id', payment_record.id,
    'status', payment_record.payment_status,
    'amount', payment_record.total_amount,
    'currency', payment_record.currency,
    'created_at', payment_record.created_at,
    'processed_at', payment_record.processed_at
  );
END;
$$;

-- Ensure all RLS policies are properly set for the cleaned system
-- Update booking policies to handle manual invoice flow
DROP POLICY IF EXISTS "System can update bookings" ON public.bookings;
CREATE POLICY "System can update bookings" ON public.bookings
  FOR UPDATE
  USING (true);

-- Ensure admin settings have default commission rate
INSERT INTO public.admin_settings (setting_key, setting_value, description) 
VALUES ('default_commission_rate', '15', 'Default platform commission rate percentage')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Reset sequences for clean start
SELECT setval('public.bookings_id_seq'::regclass, 1, false);
SELECT setval('public.payments_id_seq'::regclass, 1, false);
SELECT setval('public.notifications_id_seq'::regclass, 1, false);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.complete_manual_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_status(UUID) TO authenticated;