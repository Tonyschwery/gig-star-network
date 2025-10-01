// FILE: src/lib/auth-utils.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * forceClearAuth / resetAuthState
 * Fully clears Supabase auth, localStorage, sessionStorage, IndexedDB, Cache Storage, cookies, and service workers.
 *
 * @param opts.fullClear If true, clears everything regardless of keys/prefixes.
 */
export async function forceClearAuth(opts?: { fullClear?: boolean }) {
  const fullClear = !!opts?.fullClear;

  // 1) Sign out from Supabase to clear server-side session cookies
  try {
    if (supabase?.auth) await supabase.auth.signOut();
  } catch (err) {
    console.warn("Supabase signOut failed", err);
  }

  // 2) Clear localStorage keys related to Supabase
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const k = key.toLowerCase();
      if (fullClear || k.includes("supabase") || k.includes("sb-")) {
        localStorage.removeItem(key);
        i = -1; // reset index after removal
      }
    }
  } catch (err) {
    console.warn("localStorage cleanup failed", err);
  }

  // 3) Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch (err) {
    console.warn("sessionStorage.clear failed", err);
  }

  // 4) Delete IndexedDB databases related to Supabase
  try {
    if (typeof indexedDB !== "undefined" && typeof (indexedDB as any).databases === "function") {
      const dbs: Array<{ name?: string }> = await (indexedDB as any).databases();
      for (const db of dbs) {
        if (!db.name) continue;
        const name = db.name;
        if (fullClear || name.startsWith("sb-") || name.toLowerCase().includes("supabase")) {
          try {
            indexedDB.deleteDatabase(name);
          } catch (e) {
            console.warn("deleteDatabase failed for", name, e);
          }
        }
      }
    } else {
      // Fallback for browsers that don't expose indexedDB.databases()
      const fallback = ["sb-auth", "supabase", "localforage", "supabase-storage", "sb"];
      fallback.forEach(n => {
        try {
          indexedDB.deleteDatabase(n);
        } catch (e) {
          // ignore
        }
      });
    }
  } catch (err) {
    console.warn("IndexedDB cleanup failed", err);
  }

  // 5) Clear caches (Cache Storage API)
  try {
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (err) {
    console.warn("caches cleanup failed", err);
  }

  // 6) Unregister service workers
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (err) {
    console.warn("serviceWorker unregister failed", err);
  }

  // 7) Remove non-HttpOnly cookies
  try {
    const cookies = document.cookie.split(";").map(c => c.trim()).filter(Boolean);
    const host = location.hostname;
    cookies.forEach(c => {
      const name = c.split("=")[0];
      try {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${host}`;
      } catch (e) {
        document.cookie = `${name}=; Max-Age=0; path=/`;
      }
    });
  } catch (err) {
    console.warn("cookie cleanup failed", err);
  }
}
