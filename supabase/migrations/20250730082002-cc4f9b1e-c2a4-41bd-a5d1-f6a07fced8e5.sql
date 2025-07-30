-- Set up daily cron job to cleanup past events
-- This will run daily at 2:00 AM UTC to move past events to completed status

-- First enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup job to run daily at 2:00 AM UTC
SELECT cron.schedule(
  'daily-cleanup-past-events',
  '0 2 * * *', -- Run daily at 2:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://myxizupccweukrxfdqmc.supabase.co/functions/v1/cleanup-past-events',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);