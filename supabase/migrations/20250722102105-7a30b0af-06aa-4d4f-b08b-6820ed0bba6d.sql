-- Add booker email field to bookings table
ALTER TABLE public.bookings 
ADD COLUMN booker_email text;