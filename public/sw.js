// This is the entire content of your new public/sw.js
self.addEventListener('install', (event) => {
  // Tell the browser to activate this new SW immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 1. UNREGISTER (kill) this Service Worker
  self.registration.unregister()
    .then(() => {
      console.log('Service Worker unregistered successfully.');
    })
    .catch((error) => {
      console.error('Service Worker unregistration failed:', error);
    });

  // 2. Force all open browser tabs to reload
  event.waitUntil(
    self.clients.claim().then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then(clients => {
      clients.forEach(client => {
        // Only navigate if the client URL matches the SW scope
        // This avoids refreshing unrelated tabs if the SW scope is too broad
        if (client.url.startsWith(self.registration.scope)) {
          client.navigate(client.url);
        }
      });
    })
  );
});

// Add a fetch listener to ensure the SW stays active long enough to unregister
// even if the user navigates away quickly.
self.addEventListener('fetch', (event) => {
  // You can optionally add logic here if needed, but for a kill switch,
  // simply responding quickly or letting the browser handle it is fine.
  // Example: respondWith(fetch(event.request));
});