import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

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
              setMode('artist');
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

        // Smart Data Management Integration
        if (event === 'SIGNED_IN') {
          queryClient.invalidateQueries();
        }
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const value = { user, session, loading, status, mode, setMode, profile, signOut };

  // This crucial fix prevents the app from rendering until the initial
  // auth check is complete, solving the "black screen" issue.
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

