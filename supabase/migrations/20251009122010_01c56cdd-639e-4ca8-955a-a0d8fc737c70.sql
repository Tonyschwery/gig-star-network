-- Fix booking event_type constraint to include all allowed types
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_event_type_check;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'wedding'::text, 
  'birthday'::text, 
  'corporate'::text, 
  'opening'::text, 
  'club'::text, 
  'school'::text, 
  'festival'::text, 
  'private party'::text, 
  'other'::text,
  'admin_support'::text
]));