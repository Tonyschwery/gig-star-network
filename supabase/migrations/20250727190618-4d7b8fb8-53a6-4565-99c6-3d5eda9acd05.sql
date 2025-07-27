-- Clean up duplicate payment records using a different approach
WITH latest_payments AS (
  SELECT DISTINCT ON (booking_id, payment_method) 
    id, booking_id, payment_method
  FROM payments 
  ORDER BY booking_id, payment_method, created_at DESC
)
DELETE FROM payments 
WHERE id NOT IN (SELECT id FROM latest_payments);

-- Now add the unique constraint
ALTER TABLE payments ADD CONSTRAINT unique_booking_payment 
UNIQUE (booking_id, payment_method);