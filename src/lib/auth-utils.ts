// lib/auth-utils.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * forceClearAuth() / resetAuthState()
 * - signs out via Supabase (so server cookies are cleared if used)
 * - clears supabase-related localStorage keys
 * - clears sessionStorage
 * - attempts to delete IndexedDB DBs (sb-* / supabase)
 * - clears caches (caches API)
 * - unregisters service workers
 * - removes non-HttpOnly cookies (tries domain/path)
 *
 * Call this only when switching accounts / before signup or login when you want a fresh state,
 * or on the signup page mount to handle "refresh during signup".
 */
export async function forceClearAuth(opts?: { fullClear?: boolean }) {
  const fullClear = !!opts?.fullClear;

  // 1) Ask Supabase to sign out (this is important to clear any server cookies)
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("supabase.signOut() failed", err);
  }

  // 2) Clear localStorage keys related to Supabase (don't blindly clear everything unless fullClear)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const k = key.toLowerCase();
      if (
        fullClear ||
        k.includes("supabase") ||
        k.includes("supabase.auth") ||
        k.includes("sb-") ||
        k.includes("sb:")
      ) {
        localStorage.removeItem(key);
        // adjust the index after removal
        i = -1;
      }
    }
  } catch (err) {
    console.warn("localStorage cleanup failed", err);
  }

  // 3) sessionStorage (safe to clear in this context)
  try {
    sessionStorage.clear();
  } catch (err) {
    console.warn("sessionStorage.clear failed", err);
  }

  // 4) Delete IndexedDB databases that look like Supabase (sb-*) — modern browsers expose indexedDB.databases()
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
      // Fallback: best-effort delete of commonly used database names
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

  // 6) Unregister any service workers (Lovable sometimes injects one)
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch (err) {
    console.warn("serviceWorker unregister failed", err);
  }

  // 7) Delete non-HttpOnly cookies (best-effort; HttpOnly cookies require server-side clearing)
  try {
    const cookies = document.cookie.split(";").map(c => c.trim()).filter(Boolean);
    const host = location.hostname;
    cookies.forEach(c => {
      const name = c.split("=")[0];
      // attempt remove with path and domain
      try {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${host}`;
      } catch (e) {
        // fallback
        document.cookie = `${name}=; Max-Age=0; path=/`;
      }
    });
  } catch (err) {
    console.warn("cookie cleanup failed", err);
  }
}
