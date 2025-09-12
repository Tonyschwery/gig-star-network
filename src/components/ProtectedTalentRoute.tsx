import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AuthStatus } from '@/hooks/useAuth';

interface ProtectedTalentRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export function ProtectedTalentRoute({ 
  children, 
  requireProfile = true 
}: ProtectedTalentRouteProps) {
  const { authStatus, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // We don't need to do anything while the AuthProvider is figuring things out.
    if (loading || authStatus === 'LOADING') {
      return;
    }
    
    // Define which statuses are allowed for a talent route
    const authorizedStatuses: AuthStatus[] = ['TALENT_AUTHENTICATED'];
    if (!requireProfile) {
      // If the page doesn't require a full profile (like the onboarding page),
      // we also allow talents who need to onboard.
      authorizedStatuses.push('TALENT_NEEDS_ONBOARDING');
    }
    
    // If the user's status is not in the allowed list, redirect them.
    if (!authorizedStatuses.includes(authStatus)) {
      if (authStatus === 'LOGGED_OUT') {
        navigate('/auth');
      } else if (authStatus === 'TALENT_NEEDS_ONBOARDING') {
        navigate('/talent-onboarding');
      } else {
        // If they are a booker or in an unknown state, send to homepage.
        navigate('/');
      }
    }
  }, [authStatus, loading, requireProfile, navigate]);
  
  const isAuthorized = authStatus === 'TALENT_AUTHENTICATED' || 
                       (authStatus === 'TALENT_NEEDS_ONBOARDING' && !requireProfile);

  if (loading || authStatus === 'LOADING') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}
