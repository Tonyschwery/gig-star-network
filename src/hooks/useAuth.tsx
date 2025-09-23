// FILE: src/hooks/useAuth.ts

import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserStatus = 'LOADING' | 'LOGGED_OUT' | 'BOOKER' | 'TALENT_NEEDS_ONBOARDING' | 'TALENT_COMPLETE' | 'ADMIN';
type UserMode = 'booking' | 'artist';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: UserStatus;
  profile: any | null; // This will hold either a talent or booker profile
  signOut: () => Promise<void>;
  mode: UserMode;
  setMode: (mode: UserMode) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [status, setStatus] = useState<UserStatus>('LOADING');
  const [mode, setMode] = useState<UserMode>('booking');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(true);

      if (!currentUser) {
        setStatus('LOGGED_OUT');
        setProfile(null);
        setLoading(false);
        return;
      }

      // Unified Role Checking Logic
      if (currentUser.email === 'admin@qtalent.live') {
        setStatus('ADMIN');
        setProfile({ full_name: 'Admin' });
      } else {
        // Check for a talent profile first
        const { data: talentProfile } = await supabase.from('talent_profiles').select('*').eq('user_id', currentUser.id).single();
        if (talentProfile) {
          setProfile(talentProfile);
          setStatus(talentProfile.artist_name ? 'TALENT_COMPLETE' : 'TALENT_NEEDS_ONBOARDING');
          setMode('artist');
        } else {
          // If not a talent, check for a booker profile
          const { data: bookerProfile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
          if (bookerProfile) {
            setProfile(bookerProfile);
            setStatus('BOOKER');
          } else {
            // Fallback for users who might exist before the profile trigger was made
            setStatus('LOGGED_OUT'); // Or handle as an error
          }
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Clear all auth-related data first
      setLoading(true);
      setUser(null);
      setSession(null);
      setProfile(null);
      setStatus('LOGGED_OUT');
      
      // Clear any stored session data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Signout error:', error);
        // Force reload to clear any stuck state
        window.location.reload();
      }
    } catch (error) {
      console.error('Error during signout:', error);
      // Force reload as fallback
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const value = { user, session, loading, status, profile, signOut, mode, setMode };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}