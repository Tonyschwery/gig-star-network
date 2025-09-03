-- Add talent_type_needed column to event_requests table
ALTER TABLE public.event_requests 
ADD COLUMN talent_type_needed text;

-- Remove admin_reply and related columns since admin communication should go through Universal Chat
ALTER TABLE public.event_requests 
DROP COLUMN IF EXISTS admin_reply,
DROP COLUMN IF EXISTS replied_at,
DROP COLUMN IF EXISTS replied_by;