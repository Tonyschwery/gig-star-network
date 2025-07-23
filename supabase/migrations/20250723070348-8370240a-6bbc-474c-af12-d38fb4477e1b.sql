-- Fix security warnings by setting search_path for functions
ALTER FUNCTION public.notify_booking_status_change() SET search_path = '';
ALTER FUNCTION public.notify_new_booking() SET search_path = '';
ALTER FUNCTION public.notify_message_received() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';