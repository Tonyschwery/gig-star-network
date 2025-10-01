import { supabase } from '@/integrations/supabase/client';

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
