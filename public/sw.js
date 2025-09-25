// Advanced Service Worker with Intelligent Cache Management
const VERSION = '2.2.0';
const STATIC_CACHE = 'qtalent-static-v' + VERSION;
const DYNAMIC_CACHE = 'qtalent-dynamic-v' + VERSION;
const API_CACHE = 'qtalent-api-v' + VERSION;

// Cache strategies
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  DYNAMIC: 'stale-while-revalidate',
  API: 'network-first'
};

// Static assets that should be cached aggressively
const STATIC_ASSETS = [
  /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico|webp)$/,
  /\/assets\//,
  /\/favicon/
];

// API endpoints that should NEVER be cached (always fresh)
const NEVER_CACHE = [
  /supabase/,
  /\/api\//,
  /\/auth\//,
  /\/rest\//,
  /\/functions\//,
  /\.lovableproject\.com.*\/api/,
  /ipapi\.co/,
  /api\.ipify\.org/
];

// Dynamic content that benefits from stale-while-revalidate
const DYNAMIC_CONTENT = [
  /\/(dashboard|profile|booking)/,
  /\.html$/
];

// Install event - aggressive cache cleanup and immediate activation
self.addEventListener('install', function(event) {
  console.log('SW: Installing version', VERSION);
  self.skipWaiting(); // Force immediate activation
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      // Delete all old caches immediately
      const deletePromises = cacheNames
        .filter(name => !name.includes(VERSION))
        .map(name => {
          console.log('SW: Deleting old cache:', name);
          return caches.delete(name);
        });
      return Promise.all(deletePromises);
    })
  );
});

// Activate event - take control and clean up
self.addEventListener('activate', function(event) {
  console.log('SW: Activating version', VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up any remaining old caches
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(name => !name.includes(VERSION))
            .map(name => caches.delete(name))
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
      // Send message to all clients about update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: VERSION });
        });
      })
    ])
  );
});

// Intelligent fetch handling with multiple cache strategies
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests and non-http requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Skip requests with auth headers to prevent caching sensitive data
  if (request.headers.get('authorization') || request.headers.get('Authentication')) {
    return;
  }

  event.respondWith(handleRequest(request, url));
});

async function handleRequest(request, url) {
  const requestPath = url.pathname + url.search;
  
  try {
    // NEVER cache API endpoints - always fetch fresh
    if (NEVER_CACHE.some(pattern => pattern.test(requestPath))) {
      return await fetch(request);
    }
    
    // Static assets: Cache-first strategy
    if (STATIC_ASSETS.some(pattern => pattern.test(requestPath))) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // Dynamic content: Stale-while-revalidate strategy
    if (DYNAMIC_CONTENT.some(pattern => pattern.test(requestPath))) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }
    
    // Default: Network-first for everything else
    return await networkFirst(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('SW: Fetch error for', requestPath, error);
    return fetch(request);
  }
}

// Cache-first strategy for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  if (response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
}

// Network-first strategy for API calls
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale-while-revalidate strategy for dynamic content
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Always try to fetch fresh content in background
  const fetchPromise = fetch(request).then(response => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // If no cached version, wait for network
  return await fetchPromise || new Response('Offline', { status: 503 });
}

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

// Handle messages from the main thread
self.addEventListener('message', function(event) {
  if (event.data.type === 'CLEAR_DYNAMIC_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(DYNAMIC_CACHE),
        caches.delete(API_CACHE)
      ]).then(() => {
        console.log('SW: Dynamic and API caches cleared for auth state change');
      })
    );
  }
  
  if (event.data.type === 'CLEAR_ALL_CACHE') {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }).then(() => {
        console.log('SW: All caches cleared');
      })
    );
  }
});