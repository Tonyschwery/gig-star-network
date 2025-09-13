import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
//9pm
export type AuthStatus = 'LOADING' | 'LOGGED_OUT' | 'TALENT_COMPLETE' | 'BOOKER' | 'TALENT_NEEDS_ONBOARDING';
type UserMode = 'artist' | 'booking';

// THE FIX: Add `session` and `loading` back to the type definition.
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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
  const [loading, setLoading] = useState(true); // Keep a dedicated loading state
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
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
      setLoading(false); // Set loading to false after all checks are complete
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

  // THE FIX: Ensure `loading` and `session` are provided in the context's value.
  const value = { user, session, loading, profile, status, mode, setMode, signOut };

  return (
    <AuthContext.Provider value={value}>
      {/* We can still keep this for safety, but the protected routes will also check loading state */}
      {!loading && children}
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