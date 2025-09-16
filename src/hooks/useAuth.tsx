import { useState, useEffect, createContext, useContext } from 'react';
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(true); // Set loading to true while we check roles

        if (!currentUser) {
          setStatus('LOGGED_OUT');
          setProfile(null);
          setMode('booking');
          setLoading(false);
          return;
        }

        // --- UNIFIED ROLE CHECKING LOGIC ---
        // 1. Check for Admin first
        if (currentUser.email === 'admin@qtalent.live') {
          setStatus('ADMIN');
          setProfile({ name: 'Admin' }); // Give a placeholder profile for the admin
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
            if (talentProfile.artist_name && talentProfile.biography) {
              setStatus('TALENT_COMPLETE');
              setMode('artist');
            } else {
              setStatus('TALENT_NEEDS_ONBOARDING');
              setMode('artist');
            }
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

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
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