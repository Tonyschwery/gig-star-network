-- Update the check_booking_limit function to count ACCEPTED bookings instead of CREATED bookings
CREATE OR REPLACE FUNCTION public.check_talent_booking_limit(talent_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_pro BOOLEAN := FALSE;
  current_month_start DATE := date_trunc('month', CURRENT_DATE);
  current_month_end DATE := date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
  accepted_count INTEGER := 0;
BEGIN
  -- Check if talent is Pro subscriber
  SELECT COALESCE(tp.is_pro_subscriber, FALSE) INTO is_pro
  FROM public.talent_profiles tp
  WHERE tp.id = talent_id_param;
  
  -- Pro talents have unlimited bookings
  IF is_pro THEN
    RETURN TRUE;
  END IF;
  
  -- Count ACCEPTED bookings for this talent in current month
  SELECT COUNT(*) INTO accepted_count
  FROM public.bookings b
  WHERE b.talent_id = talent_id_param 
    AND b.status = 'accepted'
    AND b.event_date >= current_month_start
    AND b.event_date <= current_month_end;
  
  -- Free talents limited to 1 accepted booking per month
  RETURN accepted_count < 1;
END;
$function$;

-- Create function to get accepted booking count for a talent
CREATE OR REPLACE FUNCTION public.get_talent_accepted_bookings_count(talent_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_month_start DATE := date_trunc('month', CURRENT_DATE);
  current_month_end DATE := date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
  accepted_count INTEGER := 0;
BEGIN
  -- Count ACCEPTED bookings for this talent in current month
  SELECT COUNT(*) INTO accepted_count
  FROM public.bookings b
  WHERE b.talent_id = talent_id_param 
    AND b.status = 'accepted'
    AND b.event_date >= current_month_start
    AND b.event_date <= current_month_end;
  
  RETURN accepted_count;
END;
$function$;