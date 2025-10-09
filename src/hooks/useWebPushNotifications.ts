import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useWebPushNotifications = () => {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  useEffect(() => {
    if (!isSupported || !user) return;

    // Register service worker
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
        return registration.pushManager.getSubscription();
      })
      .then(subscription => {
        setIsSubscribed(!!subscription);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }, [isSupported, user]);

  const requestPermission = async () => {
    if (!isSupported) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
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
    showNotification
  };
};