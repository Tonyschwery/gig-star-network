-- Enable required extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule cleanup-past-events to run daily at midnight (00:00)
SELECT cron.schedule(
  'cleanup-past-events-daily',
  '0 0 * * *', -- Run at midnight every day
  $$
  SELECT
    net.http_post(
        url:='https://myxizupccweukrxfdqmc.supabase.co/functions/v1/cleanup-past-events',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjk4ODQsImV4cCI6MjA2ODUwNTg4NH0.KiikwI4cv2x4o0bPavrHtofHD8_VdK7INEAWdHsNRpE"}'::jsonb,
        body:=concat('{"scheduled_time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule cleanup-expired-bookings to run daily at midnight (00:05)
SELECT cron.schedule(
  'cleanup-expired-bookings-daily',
  '5 0 * * *', -- Run at 00:05 every day (5 minutes after past-events cleanup)
  $$
  SELECT
    net.http_post(
        url:='https://myxizupccweukrxfdqmc.supabase.co/functions/v1/cleanup-expired-bookings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjk4ODQsImV4cCI6MjA2ODUwNTg4NH0.KiikwI4cv2x4o0bPavrHtofHD8_VdK7INEAWdHsNRpE"}'::jsonb,
        body:=concat('{"scheduled_time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);