-- Update the check constraint to include 'accepted' status
ALTER TABLE public.bookings 
DROP CONSTRAINT valid_booking_status;

-- Add the updated constraint with 'accepted' status included
ALTER TABLE public.bookings 
ADD CONSTRAINT valid_booking_status 
CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'pending_approval'::text, 'confirmed'::text, 'declined'::text, 'completed'::text, 'cancelled'::text]));