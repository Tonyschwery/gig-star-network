import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
//7pm
// Define the complete user state
export type AuthStatus = 'LOADING' | 'LOGGED_OUT' | 'TALENT' | 'BOOKER';
type UserMode = 'artist' | 'booking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
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
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: userProfile, error } = await supabase
          .from('talent_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching profile:", error);
          setStatus('BOOKER');
          setProfile(null);
        } else if (userProfile) {
          setProfile(userProfile);
          setStatus('TALENT');
          setModeState('artist');
        } else {
          setProfile({ user_id: currentUser.id });
          setStatus('BOOKER');
          setModeState('booking');
        }
      } else {
        setStatus('LOGGED_OUT');
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setMode = (newMode: UserMode) => {
    setModeState(newMode);
    if (newMode === 'booking') {
      navigate('/');
    } else if (newMode === 'artist' && status === 'TALENT') {
      navigate('/talent-dashboard');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const value = { user, session, profile, status, mode, setMode, signOut };
  
  // =================================================================
  // ===== THIS IS THE NEW DIAGNOSTIC LOGGING SECTION ==============
  // =================================================================
  useEffect(() => {
    console.log('%c[AUTH STATE CHANGED]', 'color: #fff; background-color: #222; padding: 2px 5px; border-radius: 3px;', {
        status,
        mode,
        user: user ? { id: user.id, email: user.email, user_type: user.user_metadata?.user_type } : null,
        profile: profile ? { id: profile.id, name: profile.artist_name } : null,
    });
  }, [status, mode, user, profile]);
  // =================================================================

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