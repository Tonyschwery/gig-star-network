-- Add phone number field to bookings and event_requests tables
ALTER TABLE public.bookings ADD COLUMN booker_phone text;
ALTER TABLE public.event_requests ADD COLUMN booker_phone text;