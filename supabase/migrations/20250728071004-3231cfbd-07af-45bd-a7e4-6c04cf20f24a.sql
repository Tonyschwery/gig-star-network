-- Drop the existing UPDATE policies that are causing issues
DROP POLICY "Talents can update booking status for their bookings" ON public.bookings;
DROP POLICY "Users can update their own bookings" ON public.bookings;

-- Create a corrected policy for talents to update booking status
CREATE POLICY "Talents can update booking status" ON public.bookings
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM talent_profiles 
    WHERE talent_profiles.id = bookings.talent_id 
    AND talent_profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM talent_profiles 
    WHERE talent_profiles.id = bookings.talent_id 
    AND talent_profiles.user_id = auth.uid()
  )
);

-- Create a corrected policy for users to update their own bookings
CREATE POLICY "Users can update their own bookings" ON public.bookings
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);