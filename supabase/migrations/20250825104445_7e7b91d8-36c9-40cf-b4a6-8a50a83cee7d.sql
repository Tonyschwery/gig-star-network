-- Remove problematic trigger functions and triggers that use net.http_post()
-- Drop triggers first
DROP TRIGGER IF EXISTS send_welcome_email_trigger ON auth.users;
DROP TRIGGER IF EXISTS send_talent_welcome_email_trigger ON public.talent_profiles;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS public.send_welcome_email();
DROP FUNCTION IF EXISTS public.send_talent_welcome_email();