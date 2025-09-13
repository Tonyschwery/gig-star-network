import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export type AuthStatus = 'LOADING' | 'LOGGED_OUT' | 'TALENT_COMPLETE' | 'BOOKER' | 'TALENT_NEEDS_ONBOARDING';
type UserMode = 'artist' | 'booking';
//8pm
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
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfile } = await supabase
          .from('talent_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (userProfile) {
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
        
        // Handle post-signup redirect from email link
        if (event === 'SIGNED_IN') {
            const userType = currentUser.user_metadata?.user_type;
            if(userType === 'talent') navigate('/talent-onboarding');
            else if (userType === 'booker') navigate('/booker-dashboard');
        }

      } else {
        setStatus('LOGGED_OUT');
        setProfile(null);
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

  const value = { user, profile, status, mode, setMode, signOut, session };

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