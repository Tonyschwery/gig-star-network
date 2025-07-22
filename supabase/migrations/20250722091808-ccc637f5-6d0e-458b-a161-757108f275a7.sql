-- Add equipment fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN needs_equipment boolean DEFAULT false,
ADD COLUMN equipment_types text[] DEFAULT '{}',
ADD COLUMN custom_equipment text;

-- Enable realtime for bookings table to support notifications
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Enable realtime for booking_messages table
ALTER TABLE public.booking_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;