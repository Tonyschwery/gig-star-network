// FILE: src/hooks/useAuth.ts

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type UserStatus = 'LOADING' | 'LOGGED_OUT' | 'BOOKER' | 'TALENT_NEEDS_ONBOARDING' | 'TALENT_COMPLETE' | 'ADMIN';
type UserMode = 'booking' | 'artist';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  status: UserStatus;
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  profile: any | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [status, setStatus] = useState<UserStatus>('LOADING');
  const [mode, setMode] = useState<UserMode>('booking');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const previousStatusRef = useRef<UserStatus>('LOADING');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(true);

        if (!currentUser) {
          setStatus('LOGGED_OUT');
          setProfile(null);
          setMode('booking');
          setLoading(false);
          return;
        }

        if (currentUser.email === 'admin@qtalent.live') {
          setStatus('ADMIN');
          setProfile({ name: 'Admin' });
          setMode('booking');
        } else {
          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          setProfile(talentProfile);

          if (talentProfile) {
            setStatus(talentProfile.artist_name ? 'TALENT_COMPLETE' : 'TALENT_NEEDS_ONBOARDING');
            setMode('artist');

          } else {
            setStatus('BOOKER');
            setMode('booking');
          }
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- REVISED AND CORRECTED Redirect Logic ---
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    
    // This logic now ONLY runs when the user's status changes from a non-logged-in state to a logged-in state.
    // It will NOT run when a logged-out user is just navigating the site.
    const justLoggedIn = (previousStatus === 'LOADING' || previousStatus === 'LOGGED_OUT') && 
                         (status === 'ADMIN' || status === 'BOOKER' || status === 'TALENT_COMPLETE' || status === 'TALENT_NEEDS_ONBOARDING');

    if (justLoggedIn) {
      const from = location.state?.from?.pathname || null;
      if (from && from !== '/login' && from !== '/auth') {
        navigate(from);
        return;
      }
      
      switch (status) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'BOOKER':
          navigate('/booker-dashboard');
          break;
        case 'TALENT_COMPLETE':
          navigate('/talent-dashboard');
          break;
        case 'TALENT_NEEDS_ONBOARDING':
          navigate('/talent-onboarding');
          break;
      }
    }

    // Update the previous status for the next check
    previousStatusRef.current = status;
  }, [status, navigate, location.state]);


  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate('/');
  };

  const value = { user, session, loading, status, mode, setMode, profile, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}