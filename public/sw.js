import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

const CACHE_VERSION = "v12-final-network-fix"; // <-- Updated to v11
const STATIC_CACHE = `qtalent-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `qtalent-runtime-${CACHE_VERSION}`;
const OFFLINE_CACHE = `qtalent-offline-${CACHE_VERSION}`;

// Pages to cache for offline use (excluding auth pages which should always be fresh)
const OFFLINE_PAGES = ["/", "/booker-dashboard", "/talent-dashboard"];

// Install event - cache critical pages immediately
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => {
        console.log("Caching offline pages");
        return cache.addAll(OFFLINE_PAGES);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.includes("qtalent") &&
              cacheName !== STATIC_CACHE &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== OFFLINE_CACHE
            ) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Handle cache clearing messages
  if (event.data && event.data.type === "CLEAR_ALL_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }),
    );
  }

  if (event.data && event.data.type === "CLEAR_DYNAMIC_CACHE") {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }
});

const manifest = self.__WB_MANIFEST;

// Precache all assets specified in the manifest
if (manifest) {
  precacheAndRoute(manifest);
}

// Clean up old caches
cleanupOutdatedCaches();

let allowlist;
// In dev mode, only allowlist the root for PWA testing
if (import.meta.env.DEV) allowlist = [/^\/$/];

// Denylist for paths that should not be cached (auth pages should always be fresh)
const denylist = [/^\/auth\/callback/, /^\/auth/, /^\/update-password/, /^\/reset-password/];

// Cache HTML pages with NetworkFirst strategy, but exclude auth pages
registerRoute(
  ({ request, url }) => {
    // Don't cache auth-related pages
    if (denylist.some((pattern) => pattern.test(url.pathname))) {
      return false;
    }
    return request.mode === "navigate";
  },
  new NetworkFirst({
    cacheName: `${STATIC_CACHE}-html`,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
      }),
    ],
  }),
);

// Cache static assets (images, fonts, CSS, JS) with CacheFirst strategy
registerRoute(
  ({ request }) =>
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script",
  new CacheFirst({
    cacheName: STATIC_CACHE,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  }),
);

// Never cache API requests - always fetch from network
registerRoute(
  ({ url }) =>
    url.origin === "https://myxizupccweukrxfdqmc.supabase.co" ||
    url.pathname.startsWith("/functions/") ||
    url.pathname.includes("/rest/") ||
    url.pathname.includes("/auth/") ||
    url.pathname.includes("/storage/"),
  new NetworkFirst({
    cacheName: RUNTIME_CACHE,
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
);

// Handle push notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event.notification);

  event.notification.close();

  // Handle action clicks
  if (event.action === "close") {
    return;
  }

  // Get the URL from notification data or use default
  const urlToOpen = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          const clientUrl = new URL(client.url).origin;
          const targetUrl = new URL(urlToOpen).origin;

          if (clientUrl === targetUrl && "focus" in client) {
            // Focus the existing window and navigate to the URL
            return client.focus().then(() => {
              if ("navigate" in client) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  let data = {
    title: "Qtalent",
    body: "You have a new notification",
    url: "/",
    tag: "qtalent-notification",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      console.error("Error parsing push data:", e);
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body || "You have a new notification",
    icon: "/pwa-icon.svg",
    badge: "/favicon.ico",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
      bookingId: data.bookingId,
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: "open", title: "Open" },
      { action: "close", title: "Dismiss" },
    ],
    tag: data.tag || data.bookingId ? `booking-${data.bookingId}` : "qtalent-notification",
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(data.title || "Qtalent", options));
});

// Custom logic for clearing caches
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" && event.request.url.includes("?clearCache=true")) {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }),
    );
  }
});
