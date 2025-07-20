-- Add RLS policy to allow talents to update booking status for their own bookings
CREATE POLICY "Talents can update booking status for their bookings" 
ON public.bookings 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM talent_profiles
  WHERE talent_profiles.id = bookings.talent_id 
  AND talent_profiles.user_id = auth.uid()
))
WITH CHECK (EXISTS ( 
  SELECT 1
  FROM talent_profiles
  WHERE talent_profiles.id = bookings.talent_id 
  AND talent_profiles.user_id = auth.uid()
));