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
};