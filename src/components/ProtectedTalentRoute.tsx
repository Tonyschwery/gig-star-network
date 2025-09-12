import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Define a type for the component's state for clarity
type AuthState = 'LOADING' | 'AUTHENTICATED_WITH_PROFILE' | 'NEEDS_ONBOARDING' | 'LOGGED_OUT';

interface ProtectedTalentRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export function ProtectedTalentRoute({ 
  children, 
  requireProfile = true 
}: ProtectedTalentRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [authState, setAuthState] = useState<AuthState>('LOADING');

  useEffect(() => {
    // This listener is the most reliable way to handle auth state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // This will fire when the initial session is loaded, on sign-in, and on sign-out.
        if (session?.user) {
          if (!requireProfile) {
            setAuthState('AUTHENTICATED_WITH_PROFILE');
            return;
          }

          // We have a stable user session, now we can safely query the database.
          const { data, error } = await supabase
            .from('talent_profiles')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (error) {
            console.error("Database error checking for profile:", error);
            // On error, we assume the worst and redirect to login.
            navigate('/auth'); 
          } else if (data) {
            // Profile exists, user is fully authenticated.
            setAuthState('AUTHENTICATED_WITH_PROFILE');
          } else {
            // No profile found, user needs to onboard.
            setAuthState('NEEDS_ONBOARDING');
          }
        } else {
          // No user session found.
          setAuthState('LOGGED_OUT');
        }
      }
    );

    // Cleanup the listener when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [requireProfile, navigate]);

  // Handle redirects based on the final authentication state
  useEffect(() => {
    if (authState === 'NEEDS_ONBOARDING') {
      navigate('/talent-onboarding');
    } else if (authState === 'LOGGED_OUT') {
      navigate('/auth', { state: { from: location } });
    }
  }, [authState, navigate, location]);

  // Render content based on state
  if (authState === 'AUTHENTICATED_WITH_PROFILE') {
    return <>{children}</>;
  }

  // Show a loading spinner while we determine the auth state.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
