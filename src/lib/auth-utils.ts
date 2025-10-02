import { supabase } from '@/integrations/supabase/client';

/**
 * Clears browser cache without touching authentication
 * Use this to clear stale data while keeping user logged in
 */
export async function clearCacheOnly() {
  try {
    // Clear service worker cache
    if ('serviceWorker' in navigator) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Clear only non-auth localStorage items
    const allKeys = Object.keys(localStorage);
    const authKeys = allKeys.filter(key => key.includes('supabase') || key.includes('sb-'));
    
    allKeys.forEach(key => {
      if (!authKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    console.log('Cache cleared while preserving auth');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Forcefully clears all authentication data and session storage
 * Use this when switching accounts or resolving stuck auth states
 */
export async function forceClearAuth() {
  try {
    // Sign out from Supabase first
    await supabase.auth.signOut();

    // Clear all localStorage except non-auth items you want to keep
    const keysToKeep: string[] = [];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    });

    // Clear service worker cache
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  } catch (error) {
    console.error('Error clearing auth:', error);
  }
}

/**
 * Validates if the current session is valid and working
 */
export async function validateSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session validation error:', error);
      return false;
    }
    
    // If there's a session, try to refresh it to ensure it's valid
    if (data.session) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
}
