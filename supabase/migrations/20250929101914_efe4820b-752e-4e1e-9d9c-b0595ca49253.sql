-- Add conversation risk tracking table for advanced chat filtering
CREATE TABLE public.conversation_risk_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('booking', 'event_request')),
  sender_id UUID NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  detected_patterns TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, channel_type, sender_id)
);

-- Enable RLS
ALTER TABLE public.conversation_risk_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation risk tracking
CREATE POLICY "Users can view their own conversation risk tracking" 
ON public.conversation_risk_tracking 
FOR SELECT 
USING (auth.uid() = sender_id);

CREATE POLICY "System can insert conversation risk tracking" 
ON public.conversation_risk_tracking 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update conversation risk tracking" 
ON public.conversation_risk_tracking 
FOR UPDATE 
USING (true);

-- Admins can view all conversation risk tracking for moderation
CREATE POLICY "Admins can view all conversation risk tracking" 
ON public.conversation_risk_tracking 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create index for efficient lookups
CREATE INDEX idx_conversation_risk_tracking_lookup 
ON public.conversation_risk_tracking (channel_id, channel_type, sender_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_conversation_risk_tracking_updated_at
BEFORE UPDATE ON public.conversation_risk_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();