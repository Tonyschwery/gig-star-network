-- Phase 1: Add column to track which talents have hidden each event request
ALTER TABLE public.event_requests 
ADD COLUMN IF NOT EXISTS hidden_by_talents UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.event_requests.hidden_by_talents IS 
'Array of talent user_ids who have hidden/archived this event request from their view';

-- Phase 2: RLS Policy Updates

-- Policy 1: Allow bookers to permanently delete their own event requests
CREATE POLICY "Bookers can delete their own event requests"
ON public.event_requests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Allow admins to delete any event request
CREATE POLICY "Admins can delete any event request"
ON public.event_requests
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policy 3: Update SELECT policy to exclude hidden requests for talents
DROP POLICY IF EXISTS "Enable participants to read event requests" ON public.event_requests;

CREATE POLICY "Talents can view event requests in their location (excluding hidden)"
ON public.event_requests
FOR SELECT
TO authenticated
USING (
  -- Original booker can always see their own requests
  (auth.uid() = user_id)
  OR
  -- Admins can see all requests
  (public.is_admin(auth.uid()))
  OR
  -- Talents can see requests in their location that they haven't hidden
  (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.user_id = auth.uid()
      AND tp.location = event_requests.event_location
    )
    AND NOT (auth.uid() = ANY(COALESCE(hidden_by_talents, '{}'::uuid[])))
  )
);

-- Policy 4: Allow talents to update the hidden_by_talents array (for hiding)
CREATE POLICY "Talents can hide event requests"
ON public.event_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.talent_profiles tp
    WHERE tp.user_id = auth.uid()
    AND tp.location = event_requests.event_location
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.talent_profiles tp
    WHERE tp.user_id = auth.uid()
    AND tp.location = event_requests.event_location
  )
);