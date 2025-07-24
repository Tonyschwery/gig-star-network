-- Add budget field to bookings table
ALTER TABLE public.bookings 
ADD COLUMN budget DECIMAL(10,2),
ADD COLUMN budget_currency TEXT DEFAULT 'USD';