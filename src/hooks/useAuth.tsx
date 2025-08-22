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
          
          // Small delay to ensure state is updated
          setTimeout(async () => {
            try {
              // Check user type from metadata
              const userType = session.user.user_metadata?.user_type;
              
              if (userType === 'talent') {
                // Use secure function to check if talent has completed profile
                const { data: hasProfile, error } = await supabase.rpc('user_has_talent_profile');
                
                if (error) {
                  console.error('Error checking talent profile:', error);
                  // On error, default to safe behavior (show onboarding)
                  if (currentPath !== '/talent-onboarding') {
                    window.location.href = '/talent-onboarding';
                  }
                  return;
                }
                  
                if (!hasProfile && currentPath !== '/talent-onboarding') {
                  // New talent without profile - redirect to onboarding
                  window.location.href = '/talent-onboarding';
                } else if (hasProfile && currentPath !== '/talent-dashboard') {
                  // Existing talent with profile - always redirect to talent dashboard unless already there
                  window.location.href = '/talent-dashboard';
                }
              } else {
                // Non-talent users (bookers) - check if they have bookings
                try {
                  const { data: bookings, error: bookingsError } = await supabase
                    .from('bookings')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .limit(1);
                  
                  if (!bookingsError && bookings && bookings.length > 0) {
                    // Booker has bookings - redirect to booker dashboard
                    if (currentPath !== '/booker-dashboard') {
                      window.location.href = '/booker-dashboard';
                    }
                  } else if (currentPath === '/auth' || currentPath === '/talent-onboarding') {
                    // New booker or coming from auth pages - redirect to homepage
                    window.location.href = '/';
                  }
                } catch (error) {
                  console.error('Error checking bookings:', error);
                  // Fallback: redirect based on current path
                  if (currentPath === '/auth' || currentPath === '/talent-onboarding') {
                    window.location.href = '/';
                  }
                }
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
    // Redirect to homepage after sign out
    window.location.href = '/';
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