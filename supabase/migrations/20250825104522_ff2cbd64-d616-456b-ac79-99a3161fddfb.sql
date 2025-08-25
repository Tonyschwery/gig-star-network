-- Remove problematic trigger functions and triggers that use net.http_post()
-- Drop functions with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.send_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS public.send_talent_welcome_email() CASCADE;