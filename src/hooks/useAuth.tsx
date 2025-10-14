import React, { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ... (your types can remain the same)
type UserStatus = "LOADING" | "LOGGED_OUT" | "AUTHENTICATED";
type UserRole = "booker" | "talent" | "admin";
type ProfileStatus = "incomplete" | "complete" | "none";
type UserMode = "booking" | "artist";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: UserStatus;
  role: UserRole | null;
  profileStatus: ProfileStatus;
  profile: any | null;
  signOut: () => Promise<void>;
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [status, setStatus] = useState<UserStatus>("LOADING");
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("none");
  const [mode, setMode] = useState<UserMode>("booking");

  // ... (all your helper functions like getUserRole, loadProfile, etc., can stay the same)

  useEffect(() => {
    // ========================================================================
    // --- ✅ THIS IS THE NEW, CORRECT FIX ---
    // Define all pages that should load instantly without an auth check.
    const publicAuthPaths = ["/auth", "/login", "/auth/update-password"];

    // If the user is on one of these pages, skip all session loading.
    if (typeof window !== "undefined" && publicAuthPaths.includes(window.location.pathname)) {
      setLoading(false);
      setStatus("LOGGED_OUT");
      return; // Stop the useEffect here for these pages
    }
    // --- End of Fix ---
    // ========================================================================

    // The rest of your useEffect for handling authenticated users remains the same.
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        if (session) {
          setSession(session);
          setUser(session.user);
          // Your logic to fetch profile and roles
          // This part now only runs for authenticated users on protected pages
          // ... (rest of your existing logic)
          setStatus("AUTHENTICATED");
          setLoading(false);
        }
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
        setStatus("LOGGED_OUT");
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session) {
          setSession(session);
          setUser(session.user);
          // Your logic to fetch profile and roles
          // ... (rest of your existing logic)
          setStatus("AUTHENTICATED");
        } else {
          setStatus("LOGGED_OUT");
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ... (the rest of your AuthProvider, including signOut and the returned value, can remain the same)

  const value = {
    /* ... your existing value object ... */
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
