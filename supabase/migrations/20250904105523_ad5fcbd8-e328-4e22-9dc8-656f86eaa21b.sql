-- Create trigger to auto-create admin support booking on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_admin_support ON auth.users;
CREATE TRIGGER on_auth_user_created_admin_support
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_admin_support();

-- Create function for admin to send direct messages to users
CREATE OR REPLACE FUNCTION public.admin_send_direct_message(
  target_user_id uuid,
  message_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_support_booking_id uuid;
  message_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get or create admin support booking for this user
  SELECT id INTO admin_support_booking_id
  FROM public.bookings 
  WHERE user_id = target_user_id 
    AND event_type = 'admin_support'
    AND talent_id IS NULL;

  -- Create admin support booking if it doesn't exist
  IF admin_support_booking_id IS NULL THEN
    INSERT INTO public.bookings (
      user_id,
      talent_id,
      event_type,
      event_location,
      event_address,
      event_date,
      event_duration,
      booker_name,
      booker_email,
      status,
      description
    ) VALUES (
      target_user_id,
      NULL,
      'admin_support',
      'Online',
      'QTalents Support Chat',
      CURRENT_DATE + INTERVAL '30 days',
      60,
      'Support Request',
      '',
      'confirmed',
      'Direct communication channel with QTalents support team'
    ) RETURNING id INTO admin_support_booking_id;
  END IF;

  -- Send the message from admin
  INSERT INTO public.chat_messages (
    booking_id,
    sender_id,
    content
  ) VALUES (
    admin_support_booking_id,
    auth.uid(),
    message_content
  ) RETURNING id INTO message_id;

  RETURN message_id;
END;
$$;