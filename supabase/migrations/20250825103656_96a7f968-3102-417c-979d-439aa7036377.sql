-- Set the service role key for email functions to work
-- This allows the database triggers to call edge functions with proper authentication
ALTER DATABASE postgres SET "app.settings.service_role_key" = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eGl6dXBjY3dldWtyeGZkcW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkyOTg4NCwiZXhwIjoyMDY4NTA1ODg0fQ.zxC7_YDIhKiD7yBWKx-V-kFdwfJwOYhkOXSZpQzJ7p0';

-- Reload configuration to make the setting take effect
SELECT pg_reload_conf();