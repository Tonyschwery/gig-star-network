import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
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

  // Handle post-auth redirects in a separate effect
  useEffect(() => {
    if (!loading && user && session) {
      const currentPath = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      const isEmailConfirmation = urlParams.get('type') === 'email_confirmation' || urlParams.get('type') === 'signup';
      
      // Redirect on auth/login pages OR if this is an email confirmation
      if (currentPath === '/auth' || currentPath === '/login' || isEmailConfirmation) {
        const handleRedirect = async () => {
          try {
            // Check if user is admin first
            console.log('Checking admin status for user:', user.id);
            const { data: isAdminData, error: adminError } = await supabase
              .rpc('is_admin', { user_id_param: user.id });

            if (adminError) {
              console.error('Error checking admin status:', adminError);
              return;
            }

            console.log('Admin check result:', isAdminData);
            if (isAdminData) {
              console.log('Redirecting admin to admin panel');
              navigate('/admin');
              return;
            }

            // Check user type from metadata
            const userType = user.user_metadata?.user_type;
            console.log('User type:', userType);
            
            if (userType === 'talent') {
              // Use secure function to check if talent has completed profile
              const { data: hasProfile, error } = await supabase.rpc('user_has_talent_profile');
              
              if (error) {
                console.error('Error checking talent profile:', error);
                navigate('/talent-onboarding');
                return;
              }
                
              if (!hasProfile) {
                navigate('/talent-onboarding');
              } else {
                navigate('/talent-dashboard');
              }
            } else {
              // Non-talent users (bookers) - check for next parameter first
              const urlParams = new URLSearchParams(window.location.search);
              const nextPath = urlParams.get('next');
              
              if (nextPath) {
                // Clear the URL parameters and redirect to the intended page
                window.history.replaceState(null, '', window.location.pathname);
                navigate(nextPath);
                return;
              }
              
              // Check if they have bookings for dashboard redirect
              try {
                const { data: bookings, error: bookingsError } = await supabase
                  .from('bookings')
                  .select('id')
                  .eq('user_id', user.id)
                  .limit(1);
                
                if (!bookingsError && bookings && bookings.length > 0) {
                  navigate('/booker-dashboard');
                } else {
                  navigate('/');
                }
              } catch (error) {
                console.error('Error checking bookings:', error);
                navigate('/');
              }
            }
          } catch (error) {
            console.error('Error in post-auth redirect:', error);
            navigate('/');
          }
        };
        
        handleRedirect();
      }
    }
  }, [user, session, loading, navigate]);

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