import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BFRFuATmVGOz0BE82nKPca2V08BVFQOR4gLannxJ6aUxB6ViK1FecgkqY89arH8SLBZkMQnbNbSh4xbwrNazUIo';

export const useWebPushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isPWAMode = isStandalone || isIOSStandalone;
    setIsPWA(isPWAMode);
    
    if (isPWAMode) {
      localStorage.setItem('is-pwa-installed', 'true');
    }
    
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

  const requestPermission = useCallback(async () => {
    if (!isSupported || !user) {
      console.log('Push notifications not supported or user not logged in');
      return false;
    }

    try {
      // Check if already granted
      if (Notification.permission === 'granted') {
        console.log('Notification permission already granted');
      } else if (Notification.permission === 'denied') {
        console.log('Notification permission was denied');
        return false;
      } else {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return false;
        }
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker ready for push subscription');
      
      // Check for existing subscription
      const existingSub = await registration.pushManager.getSubscription();
      
      if (existingSub) {
        console.log('Already subscribed to push notifications');
        setSubscription(existingSub);
        setIsSubscribed(true);
        return true;
      }

      // Create new subscription
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      });

      console.log('Push subscription created:', newSub.endpoint);

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
        await newSub.unsubscribe();
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
  }, [isSupported, user]);

  // Auto-prompt for push notifications in PWA mode
  useEffect(() => {
    if (isPWA && user && isSupported && !isSubscribed) {
      const hasAutoPrompted = localStorage.getItem('pwa-push-auto-prompted');
      
      if (!hasAutoPrompted) {
        // Wait 3 seconds after PWA launch to prompt
        const timer = setTimeout(() => {
          console.log('Auto-prompting for push notifications in PWA mode');
          requestPermission();
          localStorage.setItem('pwa-push-auto-prompted', 'true');
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [isPWA, user, isSupported, isSubscribed, requestPermission]);

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

  const showNotification = async (title: string, body: string, url?: string, bookingId?: string) => {
    if (!isSupported) {
      console.log('Notifications not supported');
      return;
    }

    try {
      // Ensure permission is granted
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return;
      }

      // Get service worker registration to show notification
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(title, {
        body,
        icon: '/pwa-icon.svg',
        badge: '/favicon.ico',
        data: {
          url: url || '/',
          bookingId,
          dateOfArrival: Date.now(),
        },
        actions: [
          { action: 'open', title: 'Open' },
          { action: 'close', title: 'Dismiss' }
        ],
        tag: bookingId ? `booking-${bookingId}` : 'qtalent-notification',
        requireInteraction: false,
        silent: false,
      } as NotificationOptions & { vibrate?: number[] });
      
      console.log('Notification shown:', title);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isPWA,
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