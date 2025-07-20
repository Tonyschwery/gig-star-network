-- Add booker_name column to bookings table
ALTER TABLE public.bookings ADD COLUMN booker_name TEXT NOT NULL DEFAULT '';