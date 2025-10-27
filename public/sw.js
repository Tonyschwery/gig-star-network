// New, safer public/sw.js - ONLY unregisters, does NOT reload
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  // ONLY attempt to unregister
  self.registration.unregister()
    .then(() => {
      console.log('Service Worker unregistered successfully.');
    })
    .catch((error) => {
      console.error('Service Worker unregistration failed (but will not loop):', error);
    });

  // Claim clients to take control, but DO NOT navigate/reload
  event.waitUntil(self.clients.claim());
});

// Minimal fetch listener just to ensure activation
self.addEventListener('fetch', (event) => {
  // No caching, just pass through
  event.respondWith(fetch(event.request));
});