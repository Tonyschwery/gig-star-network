// Chrome-specific optimizations to fix caching issues
export const isChromeOrChromium = () => {
  return /Chrome|Chromium/i.test(navigator.userAgent) && !/Edge|OPR/i.test(navigator.userAgent);
};

export const addChromeHeaders = () => {
  if (!isChromeOrChromium()) return;
  
  // Add Chrome-specific cache control headers
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Cache-Control';
  meta.content = 'no-cache, no-store, must-revalidate';
  document.head.appendChild(meta);
  
  const pragma = document.createElement('meta');
  pragma.httpEquiv = 'Pragma';
  pragma.content = 'no-cache';
  document.head.appendChild(pragma);
  
  const expires = document.createElement('meta');
  expires.httpEquiv = 'Expires';
  expires.content = '0';
  document.head.appendChild(expires);
};

export const bustChromeCache = () => {
  if (!isChromeOrChromium()) return;
  
  // Force reload of dynamic content in Chrome
  const timestamp = Date.now();
  const url = new URL(window.location.href);
  url.searchParams.set('_t', timestamp.toString());
  
  // Update URL without triggering navigation
  window.history.replaceState({}, '', url.toString());
};

export const disableServiceWorkerInChrome = () => {
  if (!isChromeOrChromium() || !('serviceWorker' in navigator)) return;
  
  // Disable service worker for authenticated pages in Chrome
  if (window.location.pathname.includes('dashboard') || 
      window.location.pathname.includes('profile') ||
      window.location.pathname.includes('booking')) {
    
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        console.log('Disabling SW for Chrome on authenticated page');
        registration.unregister();
      });
    });
  }
};

// Initialize Chrome optimizations WITHOUT clearing auth caches
export const initChromeOptimizations = () => {
  if (!isChromeOrChromium()) return;
  
  console.log('Applying Chrome-specific optimizations (preserving auth)');
  addChromeHeaders();
  
  // Clear Chrome cache on page load but preserve auth data
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if ((cacheName.includes('dynamic') || cacheName.includes('api')) && !cacheName.includes('auth')) {
          caches.delete(cacheName);
        }
      });
    });
  }
};