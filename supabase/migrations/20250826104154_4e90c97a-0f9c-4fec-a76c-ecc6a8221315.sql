-- Remove all problematic email triggers that use net.http_post
DROP TRIGGER IF EXISTS trigger_user_signup_emails ON auth.users;
DROP TRIGGER IF EXISTS trigger_talent_profile_emails ON public.talent_profiles;
DROP TRIGGER IF EXISTS trigger_booking_emails ON public.bookings;
DROP TRIGGER IF EXISTS trigger_payment_emails ON public.payments;
DROP TRIGGER IF EXISTS trigger_event_request_emails ON public.event_requests;

-- Remove the problematic send_email_notification function that uses net.http_post
DROP FUNCTION IF EXISTS public.send_email_notification(text, text[], jsonb);

-- Remove the email handler functions that call the problematic function
DROP FUNCTION IF EXISTS public.handle_user_signup_emails();
DROP FUNCTION IF EXISTS public.handle_talent_profile_emails();
DROP FUNCTION IF EXISTS public.handle_booking_emails();
DROP FUNCTION IF EXISTS public.handle_payment_emails();
DROP FUNCTION IF EXISTS public.handle_event_request_emails();

-- Keep all notification-related functionality intact as it works properly
-- The notification triggers and functions remain untouched