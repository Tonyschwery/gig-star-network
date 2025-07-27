-- Add unique constraint to prevent duplicate payment records for same booking
ALTER TABLE payments ADD CONSTRAINT unique_booking_payment 
UNIQUE (booking_id, payment_method) 
DEFERRABLE INITIALLY DEFERRED;

-- Clean up any duplicate payment records (keep the latest one)
DELETE FROM payments p1 
WHERE p1.id NOT IN (
  SELECT MAX(p2.id) 
  FROM payments p2 
  WHERE p2.booking_id = p1.booking_id 
    AND p2.payment_method = p1.payment_method
  GROUP BY p2.booking_id, p2.payment_method
);

-- Update booking payment_id to reference the remaining payment
UPDATE bookings 
SET payment_id = (
  SELECT id FROM payments 
  WHERE payments.booking_id = bookings.id 
  LIMIT 1
)
WHERE payment_id IS NULL 
  AND id IN (SELECT DISTINCT booking_id FROM payments);