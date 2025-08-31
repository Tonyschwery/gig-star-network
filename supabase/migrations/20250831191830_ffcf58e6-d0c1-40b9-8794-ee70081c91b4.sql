-- Drop the old broken trigger and function
DROP TRIGGER IF EXISTS booking_notification_trigger ON public.bookings;
DROP FUNCTION IF EXISTS public.create_booking_notification();

-- Make sure the correct trigger exists with the right function
DROP TRIGGER IF EXISTS booking_status_notifications_trigger ON public.bookings;
CREATE TRIGGER booking_status_notifications_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_status_notifications();