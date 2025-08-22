-- Add admin email to admin_settings table
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES ('admin_email', 'Qtalents@proton.me', 'Primary admin email address for system notifications')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();