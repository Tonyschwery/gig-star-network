// Optimized Service Worker with Smart Cache Management
const VERSION = '3.0.0';
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
  /\/auth/,
  /\/rest\//,
  /\/functions\//,
  /\.lovableproject\.com.*\/api/,
  /ipapi\.co/,
  /api\.ipify\.org/,
  // Chrome-specific: Never cache dashboard or profile pages
  /\/dashboard/,
  /\/profile/,
  /\/booking/,
  // Never cache authentication endpoints
  /\/auth$/,
  /\/login$/
];

// Dynamic content that benefits from stale-while-revalidate
const DYNAMIC_CONTENT = [
  /\/(dashboard|profile|booking)/,
  /\.html$/
];

// Install event - smart cache management without forced activation
self.addEventListener('install', function(event) {
  console.log('SW: Installing version', VERSION);
  // Don't force immediate activation to prevent state conflicts
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      // Only delete old versions when safe
      const oldCaches = cacheNames.filter(name => 
        name.startsWith('qtalent-') && !name.includes(VERSION)
      );
      if (oldCaches.length > 0) {
        console.log('SW: Scheduling cleanup of old caches:', oldCaches);
        return Promise.all(oldCaches.map(name => caches.delete(name)));
      }
    })
  );
});

// Activate event - gentle takeover without disruption
self.addEventListener('activate', function(event) {
  console.log('SW: Activating version', VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up only conflicting old caches
      caches.keys().then(function(cacheNames) {
        const conflictingCaches = cacheNames.filter(name => 
          name.startsWith('qtalent-') && !name.includes(VERSION)
        );
        return Promise.all(conflictingCaches.map(name => caches.delete(name)));
      }),
      // Take control gradually to avoid disruption
      self.clients.claim()
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

// Handle messages from the main thread with smart cache clearing
self.addEventListener('message', function(event) {
  if (event.data.type === 'CLEAR_DYNAMIC_CACHE') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then(cache => {
        // Clear only user-specific dynamic content, PRESERVE auth-related caches
        return cache.keys().then(keys => {
          const userSpecificKeys = keys.filter(request => 
            (request.url.includes('/dashboard') || 
             request.url.includes('/profile')) &&
            !request.url.includes('/auth') &&
            !request.url.includes('supabase-auth')
          );
          return Promise.all(userSpecificKeys.map(key => cache.delete(key)));
        });
      }).then(() => {
        console.log('SW: User-specific dynamic cache cleared (auth preserved)');
      })
    );
  }
  
  if (event.data.type === 'CLEAR_ALL_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(DYNAMIC_CACHE),
        caches.delete(API_CACHE)
        // Keep static cache to avoid complete reload
      ]).then(() => {
        console.log('SW: Dynamic caches cleared, static cache preserved');
      })
    );
  }
});