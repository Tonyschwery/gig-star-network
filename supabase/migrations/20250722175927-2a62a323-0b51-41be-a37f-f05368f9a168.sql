-- Check current constraint on bookings table
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.bookings'::regclass 
AND contype = 'c';

-- If the constraint doesn't allow 'confirmed', let's update it to include more statuses
-- First, let's see what the current constraint allows
SELECT constraint_name, check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public' 
AND constraint_name LIKE '%bookings%status%';

-- Add 'confirmed' and 'paid' to the allowed statuses
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'confirmed', 'paid', 'completed', 'cancelled'));