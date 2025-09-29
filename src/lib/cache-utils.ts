// Smart cache utility functions for coordinated cache management

export const clearAppCache = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({ type: 'CLEAR_ALL_CACHE' });
    });
  }
};

export const clearDynamicCache = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.active?.postMessage({ type: 'CLEAR_DYNAMIC_CACHE' });
    });
  }
};

// AGGRESSIVE cache clearing for Chrome booking operations
export const clearCacheAfterBookingOperation = () => {
  console.log('🔥 AGGRESSIVE CACHE CLEARING after booking operation');
  
  // Clear all caches
  clearDynamicCache();
  clearAppCache();
  
  // Chrome-specific aggressive cache busting
  if (/Chrome|Chromium/i.test(navigator.userAgent) && !/Edge|OPR/i.test(navigator.userAgent)) {
    console.log('💥 Chrome detected - applying NUCLEAR cache clearing');
    
    // Clear all browser caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        console.log('Clearing all cache names:', cacheNames);
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Force reload of all stylesheets and scripts
    const timestamp = Date.now();
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    const scripts = document.querySelectorAll('script[src]');
    
    links.forEach(link => {
      const href = (link as HTMLLinkElement).href;
      if (href.includes('?')) {
        (link as HTMLLinkElement).href = href.split('?')[0] + `?v=${timestamp}`;
      } else {
        (link as HTMLLinkElement).href = href + `?v=${timestamp}`;
      }
    });
    
    scripts.forEach(script => {
      const src = (script as HTMLScriptElement).src;
      if (src && !src.includes('static')) {
        if (src.includes('?')) {
          (script as HTMLScriptElement).src = src.split('?')[0] + `?v=${timestamp}`;
        } else {
          (script as HTMLScriptElement).src = src + `?v=${timestamp}`;
        }
      }
    });
    
    // Clear localStorage entries EXCEPT Supabase auth data
    try {
      Object.keys(localStorage).forEach(key => {
        if ((key.includes('booking') || key.includes('dashboard')) && !key.includes('supabase-auth')) {
          console.log('Clearing localStorage key:', key);
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.log('Could not clear localStorage:', e);
    }
    
    // Force window location refresh with cache bust
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('_cache_bust', timestamp.toString());
    window.history.replaceState({}, '', currentUrl.toString());
  }
};

// Smart cache clearing that doesn't disrupt user experience  
export const clearCacheAfterOperation = () => {
  // Only clear dynamic cache, preserve static assets
  clearDynamicCache();
  
  // Invalidate React Query cache more selectively
  if (typeof window !== 'undefined' && 'queryClient' in window && window.queryClient) {
    const queryClient = (window as any).queryClient;
    // Only invalidate queries that might be stale, not all queries
    queryClient.invalidateQueries({ 
      predicate: (query: any) => {
        // Invalidate user-specific queries but keep static data
        return query.queryKey?.some((key: string) => 
          typeof key === 'string' && (
            key.includes('profile') || 
            key.includes('booking') || 
            key.includes('talent')
          )
        );
      }
    });
  }
  
  // Chrome-specific cache busting
  if (/Chrome|Chromium/i.test(navigator.userAgent) && !/Edge|OPR/i.test(navigator.userAgent)) {
    console.log('Applying Chrome-specific cache clearing');
    // Force browser cache refresh for dynamic content
    const timestamp = Date.now();
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      const href = (link as HTMLLinkElement).href;
      if (href.includes('?')) {
        (link as HTMLLinkElement).href = href.split('?')[0] + `?v=${timestamp}`;
      } else {
        (link as HTMLLinkElement).href = href + `?v=${timestamp}`;
      }
    });
  }
};