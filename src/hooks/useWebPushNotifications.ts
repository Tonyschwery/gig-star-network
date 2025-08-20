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

  const showNotification = async (title: string, body: string) => {
    if (!isSupported) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    // For now, show browser notification directly
    // In a real app, you'd set up push subscription and server-side push
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-message'
    });
  };

  return {
    isSupported,
    isSubscribed,
    requestPermission,
    showNotification
  };
};