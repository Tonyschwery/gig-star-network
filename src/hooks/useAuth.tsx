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
    
    // Check if user is admin from database
    try {
      const { data: isAdmin } = await supabase.rpc('is_admin', { user_id_param: user.id });
      if (isAdmin) {
        return "admin";
      }
    } catch (error) {
      console.error('[Auth] Error checking admin status:', error);
    }
    
    const userType = user.user_metadata?.user_type;
    if (userType === "talent") return "talent";
    if (userType === "booker") return "booker";
    return "booker";
  };

  const checkProfileStatus = async (user: User, userRole: UserRole): Promise<ProfileStatus> => {
    try {
      if (userRole === "talent") {
        const { data: talentProfile, error } = await supabase
          .from("talent_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) {
          console.error("Error checking talent profile:", error);
          return "none";
        }
        if (!talentProfile) return "incomplete";
        if (talentProfile.artist_name) return "complete";
        return "incomplete";
      } else if (userRole === "booker") {
        const { data: bookerProfile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          console.error("Error checking booker profile:", error);
          return "none";
        }
        return bookerProfile ? "complete" : "incomplete";
      }
      return "none";
    } catch (error) {
      console.error("Error in checkProfileStatus:", error);
      return "none";
    }
  };

  const loadProfile = async (user: User, userRole: UserRole) => {
    try {
      if (userRole === "admin") {
        setProfile({ full_name: "Admin" });
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
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (baseProfile?.role) {
        setRole(baseProfile.role as UserRole);
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
      if (!mounted || isProcessing) {
        console.log("[Auth] Skipping session processing - already in progress");
        return;
      }
      
      isProcessing = true;
      
      try {
        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);
        
        if (!currentUser) {
          setStatus("LOGGED_OUT");
          setRole(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setLoading(true);
        
        // Wrap async operations with timeout to prevent hanging
        const rolePromise = getUserRole(currentUser);
        const userRole = await Promise.race([
          rolePromise,
          new Promise<UserRole>((_, reject) => 
            setTimeout(() => reject(new Error('Role check timeout')), 5000)
          )
        ]).catch(() => "booker" as UserRole);
        
        setRole(userRole);
        
        if (userRole === "talent") {
          setMode("artist");
        } else {
          setMode("booking");
        }
        
        await loadProfile(currentUser, userRole);
        const profStatus = await checkProfileStatus(currentUser, userRole);
        setProfileStatus(profStatus);
        setStatus("AUTHENTICATED");
      } catch (error) {
        console.error("[Auth] Error processing session:", error);
        setStatus("LOGGED_OUT");
      } finally {
        setLoading(false);
        isProcessing = false;
      }
    };
    
    // Set up auth state listener - handles all session changes including cross-tab
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log("[Auth] Auth state change:", event);
      
      // Handle sign out across all tabs
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setProfileStatus("none");
        setStatus("LOGGED_OUT");
        setLoading(false);
        return;
      }
      
      // Process the session for all other events
      await processSession(session);
    });
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      processSession(session);
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear all auth state first
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setProfileStatus("none");
      setStatus("LOGGED_OUT");
      
      // Sign out from Supabase (this clears auth storage)
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear any remaining storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Force redirect to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("[Auth] Error during signout:", error);
      // Force redirect even on error to ensure user is logged out
      window.location.href = "/";
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
