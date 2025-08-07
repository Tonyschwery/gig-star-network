// PASTE THIS ENTIRE CODE BLOCK INTO src/hooks/useAuth.ts

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define the shape of our custom user profile data
interface UserProfile {
  id: string; // This is the talent_profile id
  is_pro_subscriber: boolean;
  // Add any other fields you need from talent_profiles
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null; // <-- CRITICAL ADDITION
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // <-- CRITICAL ADDITION
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (user: User | null) => {
    if (user) {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('id, is_pro_subscriber')
        .eq('user_id', user.id)
        .single();
      
      if (error) console.error("Error fetching user profile:", error);
      setProfile(data as UserProfile | null);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        await fetchUserProfile(currentUser); // Fetch profile on auth change
        setLoading(false);

        // --- Your existing redirect logic can remain here ---
        if (event === 'SIGNED_IN' && currentUser) {
          // Check if talent has completed profile
          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (talentProfile && window.location.pathname !== '/talent-dashboard/bookings') {
            // Existing talent with profile - redirect to talent dashboard bookings
            window.location.href = '/talent-dashboard/bookings';
          }
        }
      }
    );
    
    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
        if(!loading) setLoading(true);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        await fetchUserProfile(currentUser);
        setLoading(false);
    });


    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null); // Clear profile on sign out
    window.location.href = '/';
  };

  const value = {
    user,
    session,
    profile, // <-- CRITICAL ADDITION
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}