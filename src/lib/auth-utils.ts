import { supabase } from "@/integrations/supabase/client";

/**
 * forceClearAuth()
 * Clears:
 *  - Supabase session
 *  - localStorage / sessionStorage related to Supabase
 *  - IndexedDB (sb-* / supabase)
 *  - CacheStorage
 *  - Service workers
 *  - Non-HttpOnly cookies
 *
 * fullClear = true wipes everything, full reset
 */
export async function forceClearAuth(opts?: { fullClear?: boolean }) {
  const fullClear = !!opts?.fullClear;

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("supabase.signOut() failed", err);
  }

  // Clear localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const k = key.toLowerCase();
      if (fullClear || k.includes("supabase") || k.includes("sb-")) {
        localStorage.removeItem(key);
        i = -1;
      }
    }
  } catch (err) {
    console.warn("localStorage cleanup failed", err);
  }

  // Clear sessionStorage
  try { sessionStorage.clear(); } catch (err) { console.warn(err); }

  // IndexedDB cleanup
  try {
    if (typeof indexedDB !== "undefined" && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (!db.name) continue;
        if (fullClear || db.name.startsWith("sb-") || db.name.toLowerCase().includes("supabase")) {
          try { indexedDB.deleteDatabase(db.name); } catch (e) {}
        }
      }
    }
  } catch (err) { console.warn("IndexedDB cleanup failed", err); }

  // CacheStorage cleanup
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (err) { console.warn("caches cleanup failed", err); }

  // Unregister service workers
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (err) { console.warn("serviceWorker unregister failed", err); }

  // Clear non-HttpOnly cookies
  try {
    const cookies = document.cookie.split(";").map(c => c.trim()).filter(Boolean);
    const host = location.hostname;
    cookies.forEach(c => {
      const name = c.split("=")[0];
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${host}`;
      document.cookie = `${name}=; Max-Age=0; path=/`;
    });
  } catch (err) { console.warn("cookie cleanup failed", err); }
}
