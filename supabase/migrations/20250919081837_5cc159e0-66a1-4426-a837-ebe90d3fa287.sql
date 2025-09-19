-- Fix database schema and RLS policies for chat system

-- 1. Enable RLS on booker_profiles table
ALTER TABLE public.booker_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for booker_profiles
CREATE POLICY "Users can view their own booker profile" 
ON public.booker_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own booker profile" 
ON public.booker_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own booker profile" 
ON public.booker_profiles FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 3. Add missing columns to chat_messages for better organization
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_admin_chat BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS chat_type TEXT DEFAULT 'user';

-- 4. Add performance indices
CREATE INDEX IF NOT EXISTS idx_chat_messages_booking_id ON public.chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_event_request_id ON public.chat_messages(event_request_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created ON public.chat_messages(sender_id, created_at);

-- 5. Simplify and fix chat_messages RLS policies
DROP POLICY IF EXISTS "Enable participants and admin to read chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable participants to read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable participants to send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enable users to send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create messages for their bookings" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages for their bookings" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.chat_messages;

-- Create new simplified RLS policies for chat_messages
CREATE POLICY "Chat participants can read messages" 
ON public.chat_messages FOR SELECT 
USING (
  -- Admin can see all messages
  is_admin(auth.uid()) OR
  -- Booking chat participants
  (booking_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE id = chat_messages.booking_id 
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.talent_profiles 
      WHERE id = bookings.talent_id AND user_id = auth.uid()
    ))
  )) OR
  -- Event request chat participants (user and admin)
  (event_request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.event_requests 
    WHERE id = chat_messages.event_request_id 
    AND user_id = auth.uid()
  ))
);

CREATE POLICY "Chat participants can send messages" 
ON public.chat_messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Admin can send to any chat
    is_admin(auth.uid()) OR
    -- Booking chat participants
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = chat_messages.booking_id 
      AND (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.talent_profiles 
        WHERE id = bookings.talent_id AND user_id = auth.uid()
      ))
    )) OR
    -- Event request chat participants
    (event_request_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.event_requests 
      WHERE id = chat_messages.event_request_id 
      AND user_id = auth.uid()
    ))
  )
);

-- 6. Add admin notifications table if not exists
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  related_type TEXT, -- 'booking', 'event_request', etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_notifications
CREATE POLICY "Admins can view their notifications" 
ON public.admin_notifications FOR SELECT 
USING (is_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE POLICY "System can create admin notifications" 
ON public.admin_notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update their notifications" 
ON public.admin_notifications FOR UPDATE 
USING (is_admin(auth.uid()) AND admin_user_id = auth.uid());

-- 7. Create function to create admin support booking for direct admin chat
CREATE OR REPLACE FUNCTION public.get_or_create_admin_support_booking(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  support_booking_id UUID;
BEGIN
  -- Check if admin support booking already exists for this user
  SELECT id INTO support_booking_id 
  FROM public.bookings 
  WHERE user_id = target_user_id 
    AND event_type = 'admin_support'
    AND talent_id IS NULL;
  
  -- Create admin support booking if it doesn't exist
  IF support_booking_id IS NULL THEN
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
    ) RETURNING id INTO support_booking_id;
  END IF;
  
  RETURN support_booking_id;
END;
$$;