// Service Worker for Web Push Notifications with Cache Management
const CACHE_NAME = 'qtalent-cache-v' + Date.now();
const STATIC_CACHE = 'qtalent-static-v' + Date.now();

// Install event - clear old caches
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Force activation of new service worker
  
  event.waitUntil(
    // Clear old caches on install
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Activate event - take control immediately
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - network first strategy for dynamic content
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Network first strategy - always try to get fresh content
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // If we got a response, update cache with fresh content
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // If network fails, try cache as fallback
        return caches.match(event.request);
      })
  );
});

// Push notification handling
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'chat-message',
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View Chat'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});