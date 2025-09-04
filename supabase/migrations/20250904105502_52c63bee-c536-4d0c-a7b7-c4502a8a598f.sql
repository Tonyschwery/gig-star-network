-- Create trigger function to auto-create admin support booking for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_admin_support()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create admin support booking for every new user
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
    NEW.id,
    NULL,
    'admin_support',
    'Online',
    'QTalents Support Chat',
    CURRENT_DATE + INTERVAL '30 days',
    60,
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'User') || ' Support',
    NEW.email,
    'confirmed',
    'Direct communication channel with QTalents support team'
  );
  
  RETURN NEW;
END;
$$;