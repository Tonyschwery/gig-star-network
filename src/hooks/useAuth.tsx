import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle successful sign in - check user type and existing profiles
        if (event === 'SIGNED_IN' && session?.user) {
          const currentPath = window.location.pathname;
          
          // Only redirect if coming from auth page or onboarding
          if (currentPath === '/auth' || currentPath === '/talent-onboarding') {
            // Small delay to ensure state is updated
            setTimeout(async () => {
              try {
                // Check user type from metadata
                const userType = session.user.user_metadata?.user_type;
                
                if (userType === 'talent') {
                  // Check if talent has completed profile
                  const { data: profile } = await supabase
                    .from('talent_profiles')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .maybeSingle();
                    
                  if (!profile && currentPath !== '/talent-onboarding') {
                    // New talent without profile - redirect to onboarding
                    window.location.href = '/talent-onboarding';
                  } else if (profile) {
                    // Existing talent with profile - redirect to dashboard
                    window.location.href = '/talent-dashboard';
                  }
                } else if (userType === 'booker') {
                  // Booker - redirect to home/dashboard
                  window.location.href = '/';
                }
              } catch (error) {
                console.error('Error checking user profile:', error);
                // Fallback: redirect based on current path
                if (currentPath === '/auth') {
                  window.location.href = '/';
                }
              }
            }, 100);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}