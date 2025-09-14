import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export type AuthStatus = 'LOADING' | 'LOGGED_OUT' | 'TALENT_COMPLETE' | 'BOOKER' | 'TALENT_NEEDS_ONBOARDING';
export type UserMode = 'artist' | 'booking';
//9pm
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  status: AuthStatus;
  mode: UserMode;
  loading: boolean;
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setSession(session);

      if (currentUser) {
        const { data: userProfile, error } = await supabase
          .from('talent_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
          setStatus('BOOKER');
          setProfile(null);
        } else if (userProfile) {
          setProfile(userProfile);
          setStatus('TALENT_COMPLETE');
          setModeState('artist');
        } else {
          if (currentUser.user_metadata?.user_type === 'talent') {
            setStatus('TALENT_NEEDS_ONBOARDING');
          } else {
            setStatus('BOOKER');
          }
          setProfile({ id: currentUser.id, ...currentUser.user_metadata });
          setModeState('booking');
        }
      } else {
        setStatus('LOGGED_OUT');
        setProfile(null);
        setModeState('booking');
      }
      setLoading(false);
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
    // This is the crucial line that forces the browser to go to the homepage after signing out.
    // It ensures a full page refresh, clearing all user state.
    window.location.href = '/';
  };

  const value = { user, session, profile, status, mode, loading, setMode, signOut };

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