import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useWebPushNotifications } from '@/hooks/useWebPushNotifications';
import { useCapacitorPushNotifications } from '@/hooks/useCapacitorPushNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

/**
 * Unified component that handles notifications for both web and native platforms
 */
export const UnifiedNotificationHandler = () => {
  // Real-time database notifications (works on all platforms)
  useRealtimeNotifications();
  
  // Web push notifications (initialized on all platforms but only works on web)
  useWebPushNotifications();
  
  // Capacitor push notifications (only works on native)
  useCapacitorPushNotifications();

  return null;
};
