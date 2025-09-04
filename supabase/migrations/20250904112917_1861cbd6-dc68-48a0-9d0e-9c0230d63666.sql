-- Fix the remaining trigger functions with search_path
CREATE OR REPLACE FUNCTION public.complete_manual_payment(payment_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix create_admin_support_booking function
CREATE OR REPLACE FUNCTION public.create_admin_support_booking(user_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  support_booking_id UUID;
BEGIN
  -- Check if admin support booking already exists for this user
  SELECT id INTO support_booking_id 
  FROM public.bookings 
  WHERE user_id = user_id_param 
    AND event_type = 'admin_support'
    AND talent_id IS NULL;
  
  -- Create admin support booking if it doesn't exist
  IF support_booking_id IS NULL THEN
    INSERT INTO public.bookings (
      user_id,
      talent_id,
      event_type,
      event_location,
      event_address,
      event_date,
      event_duration,
      booker_name,
      booker_email,
      status,
      description
    ) VALUES (
      user_id_param,
      NULL,
      'admin_support',
      'Online',
      'QTalents Support Chat',
      CURRENT_DATE + INTERVAL '30 days', -- Future date to keep it active
      60, -- 1 hour default
      'Support Request',
      '',
      'confirmed',
      'Direct communication channel with QTalents support team'
    ) RETURNING id INTO support_booking_id;
  END IF;
  
  RETURN support_booking_id;
END;
$$;