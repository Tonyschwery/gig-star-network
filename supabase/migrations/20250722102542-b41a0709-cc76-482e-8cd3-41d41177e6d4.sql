-- Make talent_id nullable to support public booking requests
ALTER TABLE public.bookings 
ALTER COLUMN talent_id DROP NOT NULL;