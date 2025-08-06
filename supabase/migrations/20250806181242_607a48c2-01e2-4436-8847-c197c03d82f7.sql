-- Remove the redundant payment_id column from bookings table
-- This creates a circular dependency with payments.booking_id
-- The correct design is: payments.booking_id -> bookings.id (one-to-many)

ALTER TABLE public.bookings DROP COLUMN IF EXISTS payment_id;