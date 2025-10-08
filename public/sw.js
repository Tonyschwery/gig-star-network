import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
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

// ✅ THIS IS THE FIX ✅
// We are creating a 'denylist' to tell the service worker to
// completely ignore the auth callback path. This prevents it from
// stripping the login token from the URL.
const denylist = [/^\/auth\/callback/];

// Fallback to the root for single-page app navigation
const handler = createHandlerBoundToURL("/");
const navigationRoute = new NavigationRoute(handler, {
  denylist,
  allowlist,
});
registerRoute(navigationRoute);

// Custom logic for clearing caches on logout etc.
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" && event.request.url.includes("?clearCache=true")) {
    // Logic to clear caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Add logic to selectively clear caches if needed
          return caches.delete(cacheName);
        }),
      );
    });
  }
});
