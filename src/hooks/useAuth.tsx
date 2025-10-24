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
    let processingTimeout: NodeJS.Timeout | null = null;
    
    const processSession = async (session: Session | null, skipDelay = false) => {
      if (!mounted) return;
      
      // 🔐 CRITICAL FIX: Check sessionStorage flag for password recovery
      const isPasswordRecovery = sessionStorage.getItem('isPasswordRecovery') === 'true';
      
      if (isPasswordRecovery) {
        console.log("[Auth] Password recovery flag detected - skipping ALL session processing");
        return; // Let UpdatePassword component handle this
      }
      
      // Debounce rapid session changes
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
      
      const doProcess = async () => {
        if (!mounted) return;
        
        try {
          const currentUser = session?.user ?? null;
          
          // Update session and user immediately for cross-tab sync
          setSession(session);
          setUser(currentUser);
          
          if (!currentUser) {
            setStatus("LOGGED_OUT");
            setRole(null);
            setProfile(null);
            setProfileStatus("none");
            setLoading(false);
            return;
          }
          
          setLoading(true);
          setStatus("LOADING");
          
          // Get user role with timeout protection
          const userRole = await Promise.race([
            getUserRole(currentUser),
            new Promise<UserRole>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            )
          ]).catch(() => "booker" as UserRole);
          
          if (!mounted) return;
          
          setRole(userRole);
          setMode(userRole === "talent" ? "artist" : "booking");
          
          // Load profile data without blocking
          Promise.all([
            loadProfile(currentUser, userRole),
            checkProfileStatus(currentUser, userRole)
          ]).then(([_, profStatus]) => {
            if (!mounted) return;
            setProfileStatus(profStatus);
            setStatus("AUTHENTICATED");
            setLoading(false);
          }).catch(() => {
            if (!mounted) return;
            setStatus("AUTHENTICATED");
            setLoading(false);
          });
          
        } catch (error) {
          if (!mounted) return;
          console.error("[Auth] Session processing error:", error);
          setStatus("LOGGED_OUT");
          setLoading(false);
        }
      };
      
      if (skipDelay) {
        doProcess();
      } else {
        processingTimeout = setTimeout(doProcess, 100);
      }
    };
    
    // Set up auth state listener with proper event handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      // 🔐 CRITICAL FIX: Detect PASSWORD_RECOVERY event and set flag
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('isPasswordRecovery', 'true');
        console.log("[Auth] PASSWORD_RECOVERY event detected - recovery flag set");
        return; // Let UpdatePassword component handle this
      }
      
      // 🔐 Check sessionStorage flag for password recovery
      const isPasswordRecovery = sessionStorage.getItem('isPasswordRecovery') === 'true';
      
      if (isPasswordRecovery) {
        console.log("[Auth] Password recovery flag detected - skipping event processing", { event });
        return; // UpdatePassword component will handle this
      }
      
      // Handle different auth events
      if (event === 'SIGNED_OUT') {
        // Immediate state clear for sign out
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setProfileStatus("none");
        setStatus("LOGGED_OUT");
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // Just update session, don't reload everything
        setSession(session);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        // Process full session for these events
        processSession(session, event === 'SIGNED_IN');
      }
    });
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        processSession(session, true);
      }
    });
    
    // Listen for storage events for cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'supabase.auth.token' && e.newValue === null) {
        // Auth was cleared in another tab
        if (mounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setProfileStatus("none");
          setStatus("LOGGED_OUT");
          setLoading(false);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      mounted = false;
      if (processingTimeout) clearTimeout(processingTimeout);
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const signOut = async () => {
    try {
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setProfileStatus("none");
      setStatus("LOGGED_OUT");
      setLoading(true);
      
      // Sign out from Supabase with global scope (affects all tabs)
      await supabase.auth.signOut({ scope: 'global' });
      
      // Only clear auth-related storage, preserve other app data
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth') || key === 'userLocation'
      );
      authKeys.forEach(key => localStorage.removeItem(key));
      
      // Small delay to ensure storage events propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to home and force page refresh to clear all state
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } catch (error) {
      console.error("[Auth] Signout error:", error);
      // Force navigation even on error
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
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
