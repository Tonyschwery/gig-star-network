-- Update the bookings table to support pending_approval status
-- This ensures the status column can handle the new pending_approval value
ALTER TABLE public.bookings 
ADD CONSTRAINT valid_booking_status 
CHECK (status IN ('pending', 'approved', 'pending_approval', 'confirmed', 'completed', 'declined'));

-- Create an index on status for better performance when filtering
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Create an index on event_date for better performance when filtering by date
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);