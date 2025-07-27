-- Clean up duplicate payment records (keep the latest one)
DELETE FROM payments p1 
WHERE p1.id NOT IN (
  SELECT MAX(p2.id) 
  FROM payments p2 
  WHERE p2.booking_id = p1.booking_id 
    AND p2.payment_method = p1.payment_method
  GROUP BY p2.booking_id, p2.payment_method
);

-- Now add the unique constraint
ALTER TABLE payments ADD CONSTRAINT unique_booking_payment 
UNIQUE (booking_id, payment_method);