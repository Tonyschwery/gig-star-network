import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define the possible states for a user
export type AuthStatus = 
  | 'LOADING'
  | 'LOGGED_OUT'
  | 'TALENT_AUTHENTICATED'
  | 'BOOKER_AUTHENTICATED'
  | 'TALENT_NEEDS_ONBOARDING';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // Kept for general purpose loading if needed elsewhere
  authStatus: AuthStatus;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('LOADING');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // User is logged in, now we determine their specific status
          const { data: talentProfile, error } = await supabase
            .from('talent_profiles')
            .select('id') // We only need to check for existence
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (error) {
            console.error("Error checking talent profile:", error);
            // Fallback to a generic booker state on error
            setAuthStatus('BOOKER_AUTHENTICATED');
          } else if (talentProfile) {
            // A profile exists, they are a fully authenticated talent
            setAuthStatus('TALENT_AUTHENTICATED');
          } else {
            // No profile exists, they could be a talent who needs to onboard, or a booker.
            // We rely on the user_type metadata set during signup.
            if (currentUser.user_metadata?.user_type === 'talent') {
              setAuthStatus('TALENT_NEEDS_ONBOARDING');
            } else {
              setAuthStatus('BOOKER_AUTHENTICATED');
            }
          }
        } else {
          // No user session, they are logged out.
          setAuthStatus('LOGGED_OUT');
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
    window.location.href = '/';
  };

  const value = {
    user,
    session,
    loading,
    authStatus,
    signOut,
  };
  
  // We don't render children until the initial status check is complete
  return (
    <AuthContext.Provider value={value}>
      {authStatus !== 'LOADING' && children}
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
