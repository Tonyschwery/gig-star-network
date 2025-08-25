-- Remove old conflicting triggers and functions that might be causing issues
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS update_talent_profiles_updated_at ON public.talent_profiles;
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;

-- Remove old notification functions that were causing conflicts
DROP FUNCTION IF EXISTS public.notify_new_booking() CASCADE;
DROP FUNCTION IF EXISTS public.notify_booking_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.notify_payment_completed() CASCADE;
DROP FUNCTION IF EXISTS public.notify_chat_message() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_booking_notification() CASCADE;
DROP FUNCTION IF EXISTS public.handle_booking_status_change() CASCADE;

-- Fix the security definer view issue by removing it and creating a proper one
DROP VIEW IF EXISTS public.talent_profiles_public CASCADE;
CREATE VIEW public.talent_profiles_public AS
SELECT 
  id,
  artist_name,
  act,
  age,
  gender,
  nationality,
  biography,
  music_genres,
  custom_genre,
  rate_per_hour,
  currency,
  location,
  picture_url,
  gallery_images,
  soundcloud_link,
  youtube_link,
  is_pro_subscriber,
  created_at
FROM public.talent_profiles;

-- Re-enable RLS on the view
ALTER VIEW public.talent_profiles_public SET (security_invoker = true);

-- Recreate the updated_at triggers for basic functionality
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_talent_profiles_updated_at
  BEFORE UPDATE ON public.talent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();