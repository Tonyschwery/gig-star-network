-- Update bookings to completed status where payment is completed
UPDATE bookings 
SET status = 'completed', updated_at = now()
WHERE payment_id IN (
  SELECT id FROM payments WHERE payment_status = 'completed'
) AND status != 'completed';