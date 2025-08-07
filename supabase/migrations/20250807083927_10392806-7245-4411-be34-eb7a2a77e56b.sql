-- Master Task 1: Fix Critical Database Schema Issues

-- Fix bookings table status constraints
-- Drop the conflicting bookings_status_check constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Ensure the valid_booking_status constraint allows all required statuses
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS valid_booking_status;
ALTER TABLE public.bookings ADD CONSTRAINT valid_booking_status 
CHECK (status IN ('pending', 'pending_approval', 'confirmed', 'declined', 'completed', 'cancelled'));

-- Fix payments table to include 'paid' status
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_status_check 
CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'paid'));

-- Ensure proper indexes for real-time queries
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON public.bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read ON public.messages(conversation_id, is_read);