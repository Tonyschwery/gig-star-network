import React, { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  const getUserRole = async (user: User | null): Promise<UserRole | null> => {
    if (!user) return null;
    try {
      const { data: isAdmin } = await supabase.rpc("is_admin", { user_id_param: user.id });
      if (isAdmin) return "admin";
    } catch (error) {
      console.error("[Auth] Error checking admin status:", error);
    }
    const userType = user.user_metadata?.user_type;
    return userType === "talent" ? "talent" : "booker";
  };

  const checkProfileStatus = async (user: User, userRole: UserRole): Promise<ProfileStatus> => {
    // This function can remain exactly the same
    // ... (no changes needed here)
  };

  const loadProfile = async (user: User, userRole: UserRole) => {
    // This function can remain exactly the same
    // ... (no changes needed here)
  };

  const refreshProfile = async () => {
    if (!user || !role) return;
    console.log("[Auth] Refreshing profile data");
    await loadProfile(user, role);
    const newProfileStatus = await checkProfileStatus(user, role);
    setProfileStatus(newProfileStatus);
  };

  useEffect(() => {
    // ========================================================================
    // --- ✅ THIS IS THE FIX ---
    // Create an exception for the password update page to prevent the global
    // loading state from blocking it.
    if (typeof window !== "undefined" && window.location.pathname === "/auth/update-password") {
      setLoading(false);
      setStatus("LOGGED_OUT"); // Treat this page as public
      return; // Skip all other session processing for this specific page
    }
    // --- End of Fix ---
    // ========================================================================

    let mounted = true;
    let processingTimeout: NodeJS.Timeout | null = null;

    const processSession = async (session: Session | null, skipDelay = false) => {
      // The rest of the file remains the same
      // ...
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // ...
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      // ...
    });

    const handleStorageChange = (e: StorageEvent) => {
      // ...
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      // ...
    };
  }, []);

  const signOut = async () => {
    // This function can remain exactly the same
    // ... (no changes needed here)
  };

  const value = {
    user,
    session,
    loading,
    status,
    role,
    profileStatus,
    profile,
    signOut,
    mode,
    setMode,
    refreshProfile,
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
