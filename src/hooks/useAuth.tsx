import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Define the complete user state
type AuthStatus = 'LOADING' | 'LOGGED_OUT' | 'TALENT' | 'BOOKER';
type UserMode = 'artist' | 'booking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null; // Profile can be talent or booker
  status: AuthStatus;
  mode: UserMode;
  setMode: (newMode: UserMode) => void;
  signOut: () => Promise<void>;
}
//gemini 13 4 pm
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
        // User is logged in, now fetch their profile ONCE.
        const { data: userProfile, error } = await supabase
          .from('talent_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means row not found
          console.error("Error fetching profile:", error);
          setStatus('BOOKER'); // Fallback to Booker on error
          setProfile(null);
        } else if (userProfile) {
          // Profile found, they are a talent.
          setProfile(userProfile);
          setStatus('TALENT');
          setModeState('artist'); // Default talents to artist mode
        } else {
          // No talent profile, they are a booker.
          setProfile({ user_id: currentUser.id }); // Create a lightweight profile object
          setStatus('BOOKER');
          setModeState('booking'); // Default bookers to booking mode
        }
      } else {
        // No user session.
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

  // Don't render anything until the initial status check is complete.
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