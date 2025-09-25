// Cache utility functions for managing service worker cache

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

// Utility to clear cache after data operations
export const clearCacheAfterOperation = () => {
  clearDynamicCache();
  // Also clear React Query cache if needed
  if (typeof window !== 'undefined' && 'queryClient' in window && window.queryClient) {
    (window as any).queryClient.invalidateQueries();
  }
};