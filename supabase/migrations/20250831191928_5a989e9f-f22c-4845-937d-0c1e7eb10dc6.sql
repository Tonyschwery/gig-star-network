-- Drop the old broken trigger first, then the function
DROP TRIGGER IF EXISTS booking_status_notification_trigger ON public.bookings;
DROP FUNCTION IF EXISTS public.create_booking_notification() CASCADE;

-- Clean up duplicate triggers - keep only one correct trigger
DROP TRIGGER IF EXISTS booking_status_change_notifications ON public.bookings;
DROP TRIGGER IF EXISTS create_booking_status_notifications_trigger ON public.bookings;

-- Create the single correct trigger
CREATE TRIGGER booking_status_notifications_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_status_notifications();