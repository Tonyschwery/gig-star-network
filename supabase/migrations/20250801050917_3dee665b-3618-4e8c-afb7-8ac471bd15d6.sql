-- First, let's see the current constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'bookings_status_check' AND conrelid = 'public.bookings'::regclass;

-- Drop the existing constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Create the updated constraint with 'pending_approval' included
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'approved', 'declined', 'completed', 'pending_approval'));