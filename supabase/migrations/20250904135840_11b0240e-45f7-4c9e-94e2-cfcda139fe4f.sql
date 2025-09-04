-- Manually activate Pro subscription for user who paid but webhook failed
UPDATE talent_profiles SET 
  subscription_status = 'active',
  is_pro_subscriber = true,
  plan_id = 'monthly_pro',
  current_period_end = (NOW() + INTERVAL '30 days'),
  subscription_started_at = NOW()
WHERE user_id = '32aae0aa-3247-415c-8d63-9458d4131abe';

-- Create a notification for the user about their Pro activation
INSERT INTO notifications (user_id, type, title, message)
VALUES (
  '32aae0aa-3247-415c-8d63-9458d4131abe',
  'subscription_activated',
  'Pro Subscription Recovered! 🎉',
  'Your Pro subscription has been manually activated after fixing the PayPal webhook issue. You now have access to all Pro features including 10 photos, SoundCloud & YouTube links, priority listing, and unlimited bookings!'
);