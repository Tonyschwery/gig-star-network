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

  // All your helper functions remain the same
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
    // ... (This function remains unchanged from your original)
  };
  const loadProfile = async (user: User, userRole: UserRole) => {
    // ... (This function remains unchanged from your original)
  };
  const refreshProfile = async () => {
    if (user && role) {
      await loadProfile(user, role);
      const newProfileStatus = await checkProfileStatus(user, role);
      setProfileStatus(newProfileStatus);
    }
  };

  useEffect(() => {
    // This check prevents the AuthProvider from blocking public auth pages.
    const publicAuthPaths = ["/auth", "/login", "/auth/update-password"];
    if (publicAuthPaths.includes(window.location.pathname)) {
      setLoading(false);
      setStatus("LOGGED_OUT");
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setStatus("AUTHENTICATED");
      } else {
        setStatus("LOGGED_OUT");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setStatus("AUTHENTICATED");
      } else {
        setStatus("LOGGED_OUT");
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile and role only when the user is authenticated.
  useEffect(() => {
    if (status === "AUTHENTICATED" && user) {
      getUserRole(user).then((userRole) => {
        if (userRole) {
          setRole(userRole);
          loadProfile(user, userRole);
          checkProfileStatus(user, userRole).then(setProfileStatus);
        }
      });
    }
  }, [status, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Your original signOut logic can remain here
    window.location.href = "/";
  };

  // ✅ FIX: This 'value' object is now complete and matches the AuthContextType,
  // which fixes the build error you reported.
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
