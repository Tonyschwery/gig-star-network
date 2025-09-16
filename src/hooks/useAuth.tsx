import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(true);

        if (!currentUser) {
          setStatus('LOGGED_OUT');
          setProfile(null);
          setMode('booking');
          setLoading(false);
          return;
        }

        if (currentUser.email === 'admin@qtalent.live') {
          setStatus('ADMIN');
          setProfile({ name: 'Admin' });
          setMode('booking');
          
          // Redirect admin to admin dashboard after login
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              window.location.href = '/admin';
            }, 100);
          }
        } else {
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
            setStatus('BOOKER');
            setMode('booking');
          }

          // Handle redirect for regular users after login
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              // Check if there's a redirect location in sessionStorage
              const redirectPath = sessionStorage.getItem('redirectAfterAuth');
              if (redirectPath) {
                sessionStorage.removeItem('redirectAfterAuth');
                window.location.href = redirectPath;
              } else {
                // Default redirect based on user type
                if (talentProfile) {
                  window.location.href = '/talent-dashboard';
                } else {
                  window.location.href = '/your-event';
                }
              }
            }, 100);
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
    // After sign out, navigate to home. Using window.location.href ensures a full page refresh.
    window.location.href = '/';
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