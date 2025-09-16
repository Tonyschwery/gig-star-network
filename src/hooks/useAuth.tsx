import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// This is now the single source of truth for all user statuses
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

  // This ref helps us know if this is the first time the page is loading
  // vs. a user actively signing in. This prevents unwanted redirects.
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // This listener is the core of our authentication system.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(true);

        // If the user just signed in, it's not the initial page load.
        if (event === 'SIGNED_IN') {
          isInitialLoad.current = false;
        }

        if (!currentUser) {
          setStatus('LOGGED_OUT');
          setProfile(null);
          setMode('booking');
          setLoading(false);
          isInitialLoad.current = true; // Reset on logout
          return;
        }

        // --- UNIFIED ROLE CHECKING LOGIC ---
        // 1. Check for Admin first, based on email
        if (currentUser.email === 'admin@qtalent.live') {
          setStatus('ADMIN');
          setProfile({ name: 'Admin' });
          setMode('booking');
        } else {
          // 2. If not admin, check for a Talent profile
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
            // 3. If not admin and not a talent, they must be a Booker
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

  // --- NEW: Smart redirect logic ---
  useEffect(() => {
    // We only want to redirect after a fresh login, not on every page refresh.
    // We also wait until the loading is finished.
    if (loading || isInitialLoad.current) {
        return;
    }

    // Get the page the user was trying to go to before being sent to login
    const from = location.state?.from?.pathname || null;
    if (from && from !== '/login' && from !== '/auth') {
        navigate(from);
        return;
    }
    
    // If there was no specific destination, send them to their default dashboard
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

  }, [status, loading]); // This effect runs whenever the status or loading state changes

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