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
          setLoading(false);
          
          // Redirect admin to admin dashboard after login
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              window.location.replace('/admin');
            }, 500);
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

          setLoading(false);

          // Handle redirect for regular users after login
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              // Check if there's a redirect location in sessionStorage
              const redirectPath = sessionStorage.getItem('redirectAfterAuth');
              if (redirectPath) {
                sessionStorage.removeItem('redirectAfterAuth');
                window.location.replace(redirectPath);
              } else {
                // Default redirect based on user type
                if (talentProfile) {
                  window.location.replace('/talent-dashboard');
                } else {
                  window.location.replace('/your-event');
                }
              }
            }, 500);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    try {
      // Clear all state first
      setUser(null);
      setSession(null);
      setProfile(null);
      setStatus('LOGGED_OUT');
      setMode('booking');
      
      // Clear query cache
      queryClient.clear();
      
      // Clear session storage
      sessionStorage.removeItem('redirectAfterAuth');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Force page refresh to ensure clean state
      window.location.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
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