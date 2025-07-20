-- Drop the old check constraint
ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;

-- Add new check constraint with correct status values
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text]));