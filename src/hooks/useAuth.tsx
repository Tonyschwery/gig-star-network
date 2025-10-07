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

    if (user.email === "admin@qtalent.live") {
      return "admin";
    }

    const userType = user.user_metadata?.user_type;
    if (userType === "talent") return "talent";
    if (userType === "booker") return "booker";

    return "booker";
  };

  // Helper to check profile status (only queries DB for profile completion)
  const checkProfileStatus = async (user: User, userRole: UserRole): Promise<ProfileStatus> => {
    try {
      if (userRole === "talent") {
        const { data: talentProfile, error } = await supabase
          .from("talent_profiles")
          .select("artist_name", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (error) throw error;
        return talentProfile ? "complete" : "incomplete";
      } else if (userRole === "booker") {
        const { data: bookerProfile, error } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("id", user.id);

        if (error) throw error;
        return bookerProfile ? "complete" : "incomplete";
      }
      return "none";
    } catch (error) {
      console.error("Error in checkProfileStatus:", error);
      return "none";
    }
  };

  // Helper to load profile data
  const loadProfile = async (user: User, userRole: UserRole) => {
    try {
      if (userRole === "admin") {
        setProfile({ full_name: "Admin" });
        setOnboardingComplete(true);
        return;
      }

      const { error: ensureError } = await supabase.rpc("ensure_profile", {
        p_user_id: user.id,
        p_email: user.email!,
        p_role: userRole,
      });

      if (ensureError) {
        console.error("[Auth] Error ensuring profile:", ensureError);
      }

      const { data: baseProfile } = await supabase
        .from("profiles")
        .select("onboarding_complete, onboarding_draft, role")
        .eq("id", user.id)
        .maybeSingle();

      if (baseProfile) {
        setOnboardingComplete(baseProfile.onboarding_complete || false);
        setOnboardingDraft(baseProfile.onboarding_draft || null);
        if (baseProfile.role) {
          setRole(baseProfile.role as UserRole);
        }
      }

      if (userRole === "talent") {
        const { data: talentProfile } = await supabase
          .from("talent_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        setProfile(talentProfile);
      } else if (userRole === "booker") {
        const { data: bookerProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        setProfile(bookerProfile);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  // Refresh profile data (can be called after profile updates)
  const refreshProfile = async () => {
    if (!user || !role) return;
    console.log("[Auth] Refreshing profile data");
    const newProfileStatus = await checkProfileStatus(user, role);
    setProfileStatus(newProfileStatus);
    await loadProfile(user, role);
  };

  useEffect(() => {
    let mounted = true;
    let isProcessing = false;

    console.log("[Auth] Initializing auth listener");

    const processSession = async (session: Session | null) => {
      if (!mounted || isProcessing) return;
      isProcessing = true;

      try {
        // --- THIS IS THE FIX ---
        // Force a session refresh to get the latest user data and JWT.
        // This is crucial for bypassing the client-side cache after a redirect.
        if (session) {
          await supabase.auth.refreshSession();
        }
        // --- END FIX ---

        const currentUser = session?.user ?? null;
        console.log("[Auth] Processing session for user:", currentUser?.email);

        setSession(session);
        setUser(currentUser);

        if (!currentUser) {
          console.log("[Auth] No user, setting logged out state");
          setStatus("LOGGED_OUT");
          setRole(null);
          setProfileStatus("none");
          setProfile(null);
          setOnboardingComplete(false);
          setOnboardingDraft(null);
          setLoading(false);
          return;
        }

        setLoading(true);

        const userRole = getUserRole(currentUser);
        console.log("[Auth] User role determined:", userRole);
        setRole(userRole);

        if (userRole === "talent") setMode("artist");
        else setMode("booking");

        await loadProfile(currentUser, userRole!);

        const profStatus = await checkProfileStatus(currentUser, userRole!);
        console.log("[Auth] Profile status:", profStatus);
        setProfileStatus(profStatus);

        setStatus("AUTHENTICATED");
        console.log("[Auth] Auth initialization complete, onboarding status loaded");
      } finally {
        setLoading(false);
        isProcessing = false;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      console.log("[Auth] State change:", _event);
      processSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      console.log("[Auth] Initial session check");
      processSession(session);
    });

    return () => {
      console.log("[Auth] Cleaning up auth listener");
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      console.log("[Auth] Signing out");
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setProfileStatus("none");
      setStatus("LOGGED_OUT");
      localStorage.clear();
      sessionStorage.clear();
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
    refreshProfile,
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
