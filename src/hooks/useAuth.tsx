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
        console.log('🔐 Auth state change:', event, session?.user?.email);
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          console.log('🔐 No user, setting logged out state');
          setStatus('LOGGED_OUT');
          setProfile(null);
          setMode('booking');
          setLoading(false);
          return;
        }

        console.log('🔐 User found, checking profile...');
        setLoading(true);

        if (currentUser.email === 'admin@qtalent.live') {
          console.log('🔐 Admin user detected');
          setStatus('ADMIN');
          setProfile({ name: 'Admin' });
          setMode('booking');
          setLoading(false);
          
          // For admin, navigate immediately on sign in
          if (event === 'SIGNED_IN') {
            console.log('🔐 Redirecting admin to /admin');
            // Use a small delay to ensure state is updated, but don't reload the page
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

          console.log('🔐 Talent profile:', talentProfile);
          setProfile(talentProfile);

          if (talentProfile) {
            setStatus(talentProfile.artist_name ? 'TALENT_COMPLETE' : 'TALENT_NEEDS_ONBOARDING');
            setMode('artist');
          } else {
            setStatus('BOOKER');
            setMode('booking');
          }

          setLoading(false);

          // Handle redirect for regular users after login - NO PAGE RELOAD
          if (event === 'SIGNED_IN') {
            console.log('🔐 Handling post-login redirect...');
            // Check if there's a redirect location in sessionStorage
            const redirectPath = sessionStorage.getItem('redirectAfterAuth');
            if (redirectPath) {
              console.log('🔐 Found redirect path:', redirectPath);
              sessionStorage.removeItem('redirectAfterAuth');
              // Use navigate instead of window.location to avoid page reload
              setTimeout(() => {
                window.location.href = redirectPath;
              }, 100);
            } else {
              console.log('🔐 No redirect path, using defaults');
              // Default redirect based on user type
              if (talentProfile) {
                setTimeout(() => {
                  window.location.href = '/talent-dashboard';
                }, 100);
              } else {
                // For bookers, redirect to event form
                setTimeout(() => {
                  window.location.href = '/your-event';
                }, 100);
              }
            }
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('🔐 Starting sign out process');
    setLoading(true);
    try {
      // Clear query cache first
      queryClient.clear();
      
      // Clear session storage
      sessionStorage.removeItem('redirectAfterAuth');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all state after successful sign out
      setUser(null);
      setSession(null);
      setProfile(null);
      setStatus('LOGGED_OUT');
      setMode('booking');
      setLoading(false);
      
      console.log('🔐 Sign out completed, redirecting to home');
      // Navigate to home without page reload
      window.location.href = '/';
    } catch (error) {
      console.error('🔐 Error signing out:', error);
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