import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
//8pm
export type AuthStatus = 'LOADING' | 'LOGGED_OUT' | 'TALENT_COMPLETE' | 'BOOKER' | 'TALENT_NEEDS_ONBOARDING';
type UserMode = 'artist' | 'booking';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  status: AuthStatus;
  mode: UserMode;
  setMode: (newMode: UserMode) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [status, setStatus] = useState<AuthStatus>('LOADING');
  const [mode, setModeState] = useState<UserMode>('booking');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setSession(session);

      if (currentUser) {
        // User is logged in, now fetch their profile ONCE.
        const { data: userProfile } = await supabase
          .from('talent_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (userProfile) {
          setProfile(userProfile);
          setStatus('TALENT_COMPLETE');
          setModeState('artist');
        } else {
          // No talent profile found, check metadata to see if they are a talent-in-progress or a booker.
          if (currentUser.user_metadata?.user_type === 'talent') {
            setStatus('TALENT_NEEDS_ONBOARDING');
          } else {
            setStatus('BOOKER');
          }
          setProfile({ id: currentUser.id, ...currentUser.user_metadata });
          setModeState('booking');
        }
      } else {
        // No user session.
        setStatus('LOGGED_OUT');
        setProfile(null);
        setModeState('booking');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setMode = useCallback((newMode: UserMode) => {
    setModeState(newMode);
    if (newMode === 'booking') {
      navigate('/');
    } else if (newMode === 'artist' && status === 'TALENT_COMPLETE') {
      navigate('/talent-dashboard');
    }
  }, [navigate, status]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const value = { user, profile, status, mode, setMode, signOut };

  // This is critical: Don't render the rest of the app until the initial status check is complete.
  return (
    <AuthContext.Provider value={value}>
      {status !== 'LOADING' && children}
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