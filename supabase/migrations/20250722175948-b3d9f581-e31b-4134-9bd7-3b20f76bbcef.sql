-- Drop the existing status constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add new constraint that includes 'confirmed' status
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'confirmed', 'paid', 'completed', 'cancelled'));