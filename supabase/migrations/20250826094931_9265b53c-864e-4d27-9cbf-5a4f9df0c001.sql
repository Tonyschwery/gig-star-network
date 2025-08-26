-- Booking lifecycle triggers
CREATE OR REPLACE FUNCTION public.handle_booking_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booker_email TEXT;
  booker_name TEXT;
  talent_email TEXT;
  talent_name TEXT;
  admin_emails TEXT[] := ARRAY['qtalentslive@gmail.com'];
BEGIN
  -- Get booker details
  SELECT au.email INTO booker_email
  FROM auth.users au
  WHERE au.id = NEW.user_id;
  
  booker_name := COALESCE(NEW.booker_name, 'Booker');

  -- Get talent details if assigned
  IF NEW.talent_id IS NOT NULL THEN
    SELECT au.email, tp.artist_name 
    INTO talent_email, talent_name
    FROM public.talent_profiles tp
    JOIN auth.users au ON tp.user_id = au.id
    WHERE tp.id = NEW.talent_id;
  END IF;

  -- On booking creation - notify admin only
  IF TG_OP = 'INSERT' THEN
    PERFORM public.send_email_notification(
      'admin_booking_created',
      admin_emails,
      jsonb_build_object(
        'recipient_name', 'Admin',
        'booking_id', NEW.id,
        'booker_name', booker_name,
        'booker_email', booker_email,
        'talent_name', talent_name,
        'event_type', NEW.event_type,
        'event_date', NEW.event_date,
        'event_location', NEW.event_location,
        'status', NEW.status,
        'subject', 'New Booking Request'
      )
    );
  END IF;

  -- On status change
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    
    -- Notify admin of status changes
    PERFORM public.send_email_notification(
      'admin_booking_status_changed',
      admin_emails,
      jsonb_build_object(
        'recipient_name', 'Admin',
        'booking_id', NEW.id,
        'booker_name', booker_name,
        'talent_name', talent_name,
        'event_type', NEW.event_type,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'subject', 'Booking Status Changed'
      )
    );

    -- On completion - notify all parties
    IF NEW.status = 'completed' THEN
      -- Notify booker
      PERFORM public.send_email_notification(
        'booking_completed_booker',
        ARRAY[booker_email],
        jsonb_build_object(
          'recipient_name', booker_name,
          'booking_id', NEW.id,
          'talent_name', talent_name,
          'event_type', NEW.event_type,
          'event_date', NEW.event_date,
          'event_location', NEW.event_location,
          'subject', 'Event Completed Successfully'
        )
      );

      -- Notify talent if assigned
      IF talent_email IS NOT NULL THEN
        PERFORM public.send_email_notification(
          'booking_completed_talent',
          ARRAY[talent_email],
          jsonb_build_object(
            'recipient_name', talent_name,
            'booking_id', NEW.id,
            'booker_name', booker_name,
            'event_type', NEW.event_type,
            'event_date', NEW.event_date,
            'event_location', NEW.event_location,
            'subject', 'Event Completed Successfully'
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers for booking events
DROP TRIGGER IF EXISTS on_booking_created_send_emails ON public.bookings;
CREATE TRIGGER on_booking_created_send_emails
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_emails();

DROP TRIGGER IF EXISTS on_booking_updated_send_emails ON public.bookings;
CREATE TRIGGER on_booking_updated_send_emails
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_emails();

-- Payment event triggers
CREATE OR REPLACE FUNCTION public.handle_payment_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booker_email TEXT;
  booker_name TEXT;
  talent_email TEXT;
  talent_name TEXT;
  booking_data RECORD;
  admin_emails TEXT[] := ARRAY['qtalentslive@gmail.com'];
  is_subscription BOOLEAN := FALSE;
BEGIN
  -- Only process when payment becomes completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    
    -- Get booker details
    SELECT au.email INTO booker_email
    FROM auth.users au
    WHERE au.id = NEW.booker_id;

    -- Check if this is a subscription payment or booking payment
    IF NEW.booking_id IS NOT NULL THEN
      -- Get booking and talent details
      SELECT b.*, au.email as booker_email_from_booking, tp.artist_name, au_talent.email as talent_email_full
      INTO booking_data
      FROM public.bookings b
      LEFT JOIN auth.users au ON b.user_id = au.id
      LEFT JOIN public.talent_profiles tp ON b.talent_id = tp.id
      LEFT JOIN auth.users au_talent ON tp.user_id = au_talent.id
      WHERE b.id = NEW.booking_id;

      booker_name := COALESCE(booking_data.booker_name, 'Booker');
      talent_name := booking_data.artist_name;
      talent_email := booking_data.talent_email_full;
      is_subscription := FALSE;
    ELSE
      -- This is likely a subscription payment
      is_subscription := TRUE;
      booker_name := 'Subscriber';
    END IF;

    -- Send payment receipt to payer
    PERFORM public.send_email_notification(
      CASE WHEN is_subscription THEN 'payment_receipt_subscription' ELSE 'payment_receipt_booking' END,
      ARRAY[booker_email],
      jsonb_build_object(
        'recipient_name', booker_name,
        'payment_id', NEW.id,
        'amount', NEW.total_amount,
        'currency', NEW.currency,
        'booking_id', NEW.booking_id,
        'event_type', COALESCE(booking_data.event_type, 'Subscription'),
        'is_subscription', is_subscription,
        'subject', CASE WHEN is_subscription THEN 'Payment Receipt - Subscription' ELSE 'Payment Receipt - Event Booking' END
      )
    );

    -- Send payment confirmation to talent (only for booking payments, not subscriptions)
    IF NOT is_subscription AND talent_email IS NOT NULL THEN
      PERFORM public.send_email_notification(
        'payment_received_talent',
        ARRAY[talent_email],
        jsonb_build_object(
          'recipient_name', talent_name,
          'payment_id', NEW.id,
          'booker_name', booker_name,
          'amount', NEW.talent_earnings,
          'currency', NEW.currency,
          'booking_id', NEW.booking_id,
          'event_type', booking_data.event_type,
          'subject', 'Payment Received for Your Performance'
        )
      );
    END IF;

    -- Send admin notification
    PERFORM public.send_email_notification(
      CASE WHEN is_subscription THEN 'admin_payment_subscription' ELSE 'admin_payment_booking' END,
      admin_emails,
      jsonb_build_object(
        'recipient_name', 'Admin',
        'payment_id', NEW.id,
        'booker_name', booker_name,
        'talent_name', talent_name,
        'amount', NEW.total_amount,
        'currency', NEW.currency,
        'booking_id', NEW.booking_id,
        'is_subscription', is_subscription,
        'platform_commission', NEW.platform_commission,
        'subject', CASE WHEN is_subscription THEN 'New Subscription Payment' ELSE 'New Booking Payment' END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for payment events
DROP TRIGGER IF EXISTS on_payment_completed_send_emails ON public.payments;
CREATE TRIGGER on_payment_completed_send_emails
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_emails();

-- Hero page form (event_requests) trigger
CREATE OR REPLACE FUNCTION public.handle_event_request_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_emails TEXT[] := ARRAY['qtalentslive@gmail.com'];
BEGIN
  -- Send admin notification for hero form submission
  PERFORM public.send_email_notification(
    'admin_hero_form_submission',
    admin_emails,
    jsonb_build_object(
      'recipient_name', 'Admin',
      'booker_name', COALESCE(NEW.booker_name, 'Not Provided'),
      'booker_email', COALESCE(NEW.booker_email, 'Not Provided'),
      'event_type', COALESCE(NEW.event_type, 'Not Specified'),
      'event_date', NEW.event_date,
      'event_location', COALESCE(NEW.event_location, 'Not Provided'),
      'event_duration', NEW.event_duration,
      'description', COALESCE(NEW.description, 'No description provided'),
      'subject', 'New Event Request from Website'
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for event requests (hero form)
DROP TRIGGER IF EXISTS on_event_request_created_send_emails ON public.event_requests;
CREATE TRIGGER on_event_request_created_send_emails
  AFTER INSERT ON public.event_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_event_request_emails();