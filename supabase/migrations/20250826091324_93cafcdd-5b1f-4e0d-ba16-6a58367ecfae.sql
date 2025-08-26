-- Test email trigger by creating a test event request
INSERT INTO event_requests (
  user_id, 
  booker_name, 
  booker_email, 
  event_date, 
  event_duration, 
  event_location, 
  event_type, 
  description
) VALUES (
  'f5ebcf4a-c25c-4371-8344-2f10fe4b4779', -- using existing user ID
  'Test Booker',
  'test@example.com',
  '2025-09-01',
  2,
  'Test Location',
  'Wedding',
  'Testing email notifications'
) RETURNING id;