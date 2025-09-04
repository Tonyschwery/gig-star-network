-- Create admin support bookings for all existing users who don't have one
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
)
SELECT 
  au.id,
  NULL,
  'admin_support',
  'Online',
  'QTalents Support Chat',
  CURRENT_DATE + INTERVAL '30 days',
  60,
  COALESCE(au.raw_user_meta_data ->> 'user_type', 'User') || ' Support',
  au.email,
  'confirmed',
  'Direct communication channel with QTalents support team'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.bookings b 
  WHERE b.user_id = au.id 
  AND b.event_type = 'admin_support'
  AND b.talent_id IS NULL
);