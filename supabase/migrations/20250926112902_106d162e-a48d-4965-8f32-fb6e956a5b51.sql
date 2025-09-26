-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule cleanup-expired-bookings to run daily at 3 AM
SELECT cron.schedule(
  'cleanup-expired-bookings-daily',
  '0 3 * * *', -- Daily at 3 AM
  $$
  SELECT
    net.http_post(
        url:='https://myxizupccweukrxfdqmc.supabase.co/functions/v1/cleanup-expired-bookings',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5Mjk4ODQsImV4cCI6MjA2ODUwNTg4NH0.KiikwI4cv2x4o0bPavrHtofHD8_VdK7INEAWdHsNRpE"}'::jsonb,
        body:=concat('{"scheduled_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);