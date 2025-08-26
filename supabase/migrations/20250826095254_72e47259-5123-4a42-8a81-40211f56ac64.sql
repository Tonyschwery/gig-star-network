-- Remove old duplicate email triggers and keep only our new ones

-- Remove old booking email triggers (keep our new ones: on_booking_created_send_emails, on_booking_updated_send_emails)
DROP TRIGGER IF EXISTS booking_email_notification ON public.bookings;
DROP TRIGGER IF EXISTS booking_email_notification_trigger ON public.bookings;
DROP TRIGGER IF EXISTS booking_email_trigger ON public.bookings;
DROP TRIGGER IF EXISTS booking_status_email_notification ON public.bookings;
DROP TRIGGER IF EXISTS booking_status_email_notification_trigger ON public.bookings;
DROP TRIGGER IF EXISTS booking_status_email_trigger ON public.bookings;
DROP TRIGGER IF EXISTS trigger_booking_email_notification ON public.bookings;
DROP TRIGGER IF EXISTS trigger_booking_status_email_notification ON public.bookings;

-- Remove old message email triggers
DROP TRIGGER IF EXISTS message_email_notification ON public.chat_messages;
DROP TRIGGER IF EXISTS message_email_notification_trigger ON public.chat_messages;
DROP TRIGGER IF EXISTS message_email_trigger ON public.chat_messages;
DROP TRIGGER IF EXISTS trigger_message_email_notification ON public.chat_messages;

-- Remove old event request email triggers (keep our new one: on_event_request_created_send_emails)
DROP TRIGGER IF EXISTS event_request_email_notification ON public.event_requests;
DROP TRIGGER IF EXISTS event_request_email_notification_trigger ON public.event_requests;
DROP TRIGGER IF EXISTS event_request_email_trigger ON public.event_requests;

-- Remove old payment email triggers (keep our new one: on_payment_completed_send_emails)
DROP TRIGGER IF EXISTS payment_email_notification ON public.payments;
DROP TRIGGER IF EXISTS payment_email_notification_trigger ON public.payments;
DROP TRIGGER IF EXISTS payment_email_trigger ON public.payments;
DROP TRIGGER IF EXISTS trigger_payment_email_notification ON public.payments;

-- Clean up old functions that are no longer needed
DROP FUNCTION IF EXISTS public.send_booking_email_notification() CASCADE;
DROP FUNCTION IF EXISTS public.send_booking_status_email_notification() CASCADE;
DROP FUNCTION IF EXISTS public.send_message_email_notification() CASCADE;
DROP FUNCTION IF EXISTS public.send_event_request_email_notification() CASCADE;
DROP FUNCTION IF EXISTS public.send_payment_email_notification() CASCADE;

-- Verify our new triggers are still in place
SELECT 
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public' 
AND (
  t.tgname LIKE '%send_emails%' OR
  t.tgname LIKE '%on_%_send_emails%'
)
ORDER BY c.relname, t.tgname;