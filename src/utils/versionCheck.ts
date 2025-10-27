/**
 * Version Check Utility
 * Forces cache clearing and reload when app version changes
 */

const APP_VERSION = "2.0.0";
const VERSION_KEY = "qtalent_app_version";

export const checkAndUpdateVersion = () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  
  if (storedVersion !== APP_VERSION) {
    console.log(`[VersionCheck] Version mismatch. Stored: ${storedVersion}, Current: ${APP_VERSION}`);
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Clear localStorage except auth
    const keysToKeep = ['supabase.auth.token', 'sb-refresh-token'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.some(keep => key.includes(keep))) {
        localStorage.removeItem(key);
      }
    });
    
    // Update version
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    
    // Force hard reload
    window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
  }
};

export const forceReload = () => {
  // Add timestamp to URL to bypass ALL caches
  const url = new URL(window.location.href);
  url.searchParams.set('_nocache', Date.now().toString());
  window.location.href = url.toString();
};
