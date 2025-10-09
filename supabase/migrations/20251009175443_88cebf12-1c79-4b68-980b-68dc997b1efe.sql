-- Create notification_history table for storing past push notifications
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  booking_id UUID,
  notification_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notification history
CREATE POLICY "Users can view their own notification history"
ON public.notification_history
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: System can insert notification history
CREATE POLICY "System can insert notification history"
ON public.notification_history
FOR INSERT
WITH CHECK (true);

-- Policy: Users can update their own notification history (mark as read)
CREATE POLICY "Users can update their own notification history"
ON public.notification_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_notification_history_user_id ON public.notification_history(user_id);
CREATE INDEX idx_notification_history_created_at ON public.notification_history(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notification_history;