// PASTE THIS ENTIRE CODE BLOCK INTO src/hooks/useAuth.ts

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// This defines the shape of the extra data we need for a Talent
export interface UserProfile {
  id: string; // This is the talent_profile id, not the user_id
  is_pro_subscriber: boolean;
  // Add any other fields from talent_profiles you need globally
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null; // This will hold the talent-specific data
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // This function safely fetches the talent profile if it exists
  const fetchTalentProfile = useCallback(async (currentUser: User) => {
    const { data, error } = await supabase
      .from('talent_profiles')
      .select('id, is_pro_subscriber')
      .eq('user_id', currentUser.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = row not found, which is ok
      console.error("Error fetching talent profile:", error);
    }
    
    setProfile(data as UserProfile | null);
    return data; // Return the profile data
  }, []);


  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        const currentUser = session?.user ?? null;
        setSession(session);
        setUser(currentUser);
        
        if (currentUser) {
          const talentProfile = await fetchTalentProfile(currentUser);
          // Redirect logic
          if (talentProfile && window.location.pathname === '/') {
             window.location.href = '/talent-dashboard/bookings';
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchTalentProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    window.location.href = '/';
  };

  const value = { user, session, profile, loading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}