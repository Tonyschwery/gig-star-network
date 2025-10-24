/**
 * Service Worker Manager for Capacitor
 * Ensures service worker is only active on web, not in native apps
 */

import { isCapacitor } from './platformDetection';

export const shouldEnableServiceWorker = () => {
  // Disable service worker in Capacitor native apps
  if (isCapacitor()) {
    console.log('[ServiceWorker] Disabled for native app');
    return false;
  }
  
  // Enable only if browser supports it
  return 'serviceWorker' in navigator;
};

export const unregisterServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[ServiceWorker] Unregistered:', registration);
    }
  }
};

export const initServiceWorker = () => {
  if (!shouldEnableServiceWorker()) {
    console.log('[ServiceWorker] Not initializing - not needed for this platform');
    unregisterServiceWorkers(); // Clean up any existing registrations
    return;
  }

  // Only register service worker for web
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(function(registration) {
        console.log('SW registered for PWA: ', registration);

        setInterval(() => {
          registration.update();
        }, 60000);

        navigator.serviceWorker.addEventListener('message', function(event) {
          if (event.data.type === 'SW_UPDATED') {
            console.log('Service worker updated to version:', event.data.version);
            window.location.reload();
          }
        });

        registration.addEventListener('updatefound', function() {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', function() {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content available, refreshing...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch(function(registrationError) {
        console.log('SW registration failed: ', registrationError);
      });
  });
};
