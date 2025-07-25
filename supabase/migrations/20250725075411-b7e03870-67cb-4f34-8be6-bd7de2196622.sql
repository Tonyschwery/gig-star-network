-- Add email preferences table for users
CREATE TABLE public.email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_notifications BOOLEAN NOT NULL DEFAULT true,
  payment_notifications BOOLEAN NOT NULL DEFAULT true,
  message_notifications BOOLEAN NOT NULL DEFAULT true,
  marketing_emails BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for email preferences
CREATE POLICY "Users can view their own email preferences" 
ON public.email_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email preferences" 
ON public.email_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences" 
ON public.email_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_email_preferences_updated_at
BEFORE UPDATE ON public.email_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add admin email settings table
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for admin settings (only accessible by specific admin users)
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin settings (you'll need to adjust this based on your admin user setup)
CREATE POLICY "Admin settings are system managed" 
ON public.admin_settings 
FOR ALL 
USING (false);

-- Insert default admin email setting
INSERT INTO public.admin_settings (setting_key, setting_value, description) 
VALUES ('admin_email', 'admin@example.com', 'Email address to receive admin notifications');

-- Add trigger for admin settings timestamps
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();