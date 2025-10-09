import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LIfTZZH9vXwqfMKZJHGjI1mfBMRlIy2p4jdGJhVw-bMvtE';

export const useWebPushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  useEffect(() => {
    if (!isSupported || !user) return;

    // Register service worker and check subscription
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
        return registration.pushManager.getSubscription();
      })
      .then(sub => {
        setSubscription(sub);
        setIsSubscribed(!!sub);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }, [isSupported, user]);

  const requestPermission = async () => {
    if (!isSupported || !user) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      
      if (existingSub) {
        console.log('Already subscribed to push notifications');
        return true;
      }

      // Create new subscription
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
      });

      // Store subscription in Supabase
      const subscriptionData = newSub.toJSON();
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint!,
          p256dh: subscriptionData.keys!.p256dh,
          auth: subscriptionData.keys!.auth
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('Error storing subscription:', error);
        return false;
      }

      setSubscription(newSub);
      setIsSubscribed(true);
      console.log('Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!subscription || !user) return false;

    try {
      await subscription.unsubscribe();
      
      // Remove from Supabase
      const subscriptionData = subscription.toJSON();
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscriptionData.endpoint!);

      setSubscription(null);
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  };

  const showNotification = async (title: string, body: string, url?: string) => {
    if (!isSupported) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    // Get service worker registration to show notification
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(title, {
      body,
      icon: '/pwa-icon.svg',
      badge: '/favicon.ico',
      data: {
        url: url || '/',
        dateOfArrival: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Close' }
      ],
      tag: 'qtalent-notification',
      requireInteraction: false,
    } as NotificationOptions);
  };

  return {
    isSupported,
    isSubscribed,
    requestPermission,
    unsubscribe,
    showNotification
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}