-- Remove all problematic email triggers and functions with CASCADE
DROP FUNCTION IF EXISTS public.handle_user_signup_emails() CASCADE;
DROP FUNCTION IF EXISTS public.handle_talent_profile_emails() CASCADE;
DROP FUNCTION IF EXISTS public.handle_booking_emails() CASCADE;
DROP FUNCTION IF EXISTS public.handle_payment_emails() CASCADE;
DROP FUNCTION IF EXISTS public.handle_event_request_emails() CASCADE;

-- Remove the problematic send_email_notification function
DROP FUNCTION IF EXISTS public.send_email_notification(text, text[], jsonb) CASCADE;