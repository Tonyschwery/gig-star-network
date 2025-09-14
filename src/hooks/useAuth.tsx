import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query'; // This import is added
import { supabase } from '@/integrations/supabase/client';

type UserStatus = 'LOADING' | 'LOGGED_OUT' | 'BOOKER' | 'TALENT_NEEDS_ONBOARDING' | 'TALENT_COMPLETE';
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
  const queryClient = useQueryClient(); // This line is added to get the cache controller

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data: talentProfile } = await supabase
            .from('talent_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          setProfile(talentProfile);

          if (talentProfile) {
            if (talentProfile.artist_name && talentProfile.biography) {
              setStatus('TALENT_COMPLETE');
              setMode('artist');
            } else {
              setStatus('TALENT_NEEDS_ONBOARDING');
            }
          } else {
            setStatus('BOOKER');
            setMode('booking');
          }
        } else {
          setStatus('LOGGED_OUT');
          setProfile(null);
          setMode('booking');
        }

        setLoading(false);

        // --- START OF ADDED SMART CACHE MANAGEMENT ---
        if (event === 'SIGNED_IN') {
          // When a user signs in, invalidate all existing queries.
          // This forces all components to re-fetch their data with the new user's credentials.
          queryClient.invalidateQueries();
        }
        if (event === 'SIGNED_OUT') {
          // When a user signs out, completely clear the query cache
          // to ensure no stale data from the previous user is ever shown.
          queryClient.clear();
        }
        // --- END OF ADDED SMART CACHE MANAGEMENT ---
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]); // Add queryClient to the dependency array

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const value = { user, session, loading, status, mode, setMode, profile, signOut };

  // This key fix prevents the rest of the app from rendering
  // until the initial auth check is complete, preventing black screens.
  return (
    <AuthContext.Provider value={value}>
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