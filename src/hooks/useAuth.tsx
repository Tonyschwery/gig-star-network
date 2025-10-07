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
  onboardingComplete: boolean;
  onboardingDraft: any | null;
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
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [onboardingDraft, setOnboardingDraft] = useState<any | null>(null);

  // Helper to determine role from user metadata (synchronous, no DB query)
  const getUserRole = (user: User | null): UserRole | null => {
    if (!user) return null;

    // Check for admin email
    if (user.email === "admin@qtalent.live") {
      return "admin";
    }

    // Get role from user_metadata (set during signup)
    const userType = user.user_metadata?.user_type;
    if (userType === "talent") return "talent";
    if (userType === "booker") return "booker";

    // Default to booker if not specified
    return "booker";
  };

  // ----------------------------------------------------------------
  // --- CHANGE START: Consolidated Profile Fetching Logic ---
  // ----------------------------------------------------------------
  // This function is now the single source of truth for loading all profile data.
  // It fetches fresh data from Supabase every time it's called.
  const refreshProfile = async (user: User) => {
    console.log("[Auth] Refreshing profile data...");
    const userRole = getUserRole(user);
    setRole(userRole);

    try {
      if (userRole === "admin") {
        setProfile({ full_name: "Admin" });
        setOnboardingComplete(true);
        setProfileStatus("complete");
        return;
      }

      if (!userRole) {
        setProfileStatus("none");
        return;
      }

      // Load base profile for onboarding status and draft
      const { data: baseProfile, error: baseError } = await supabase
        .from("profiles")
        .select("onboarding_complete, onboarding_draft, role")
        .eq("id", user.id)
        .maybeSingle();

      if (baseError) throw baseError;

      setOnboardingComplete(baseProfile?.onboarding_complete || false);
      setOnboardingDraft(baseProfile?.onboarding_draft || null);

      if (baseProfile?.role) {
        setRole(baseProfile.role as UserRole);
      }

      // Load detailed profile and determine profile status
      let finalProfileStatus: ProfileStatus = "incomplete";
      if (userRole === "talent") {
        const { data: talentProfile, error } = await supabase
          .from("talent_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(talentProfile);
        if (talentProfile?.artist_name) finalProfileStatus = "complete";
      } else if (userRole === "booker") {
        const { data: bookerProfile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(bookerProfile);
        if (bookerProfile) finalProfileStatus = "complete";
      }

      console.log("[Auth] Profile status:", finalProfileStatus);
      setProfileStatus(finalProfileStatus);
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
      setProfileStatus("none");
    }
  };
  // --------------------------------------------------------------
  // --- CHANGE END ---
  // --------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    // The existing auth listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      console.log("[Auth] State change event:", _event);

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setSession(session);

      if (currentUser) {
        setStatus("AUTHENTICATED");
        await refreshProfile(currentUser); // Always refresh profile on auth change
      } else {
        setStatus("LOGGED_OUT");
        // Reset all state
        setRole(null);
        setProfile(null);
        setProfileStatus("none");
        setOnboardingComplete(false);
        setOnboardingDraft(null);
      }
      setLoading(false);
    });

    // Clean up the subscription on component unmount
    return () => {
      console.log("[Auth] Cleaning up auth listener");
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // The empty array ensures this runs only once on mount.

  const signOut = async () => {
    try {
      console.log("[Auth] Signing out");
      setLoading(true);

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear state
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setProfileStatus("none");
      setStatus("LOGGED_OUT");

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to home
      window.location.href = "/";
    } catch (error) {
      console.error("[Auth] Error during signout:", error);
      setLoading(false);
    }
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
    // Provide a way to manually refresh if needed elsewhere
    refreshProfile: user ? () => refreshProfile(user) : async () => {},
    onboardingComplete,
    onboardingDraft,
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
