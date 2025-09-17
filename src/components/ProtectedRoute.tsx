import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location the user is trying to access

  useEffect(() => {
    if (status === 'LOGGED_OUT') {
      console.log('🛡️ PROTECTED ROUTE: User is logged out. Redirecting to /auth');
      console.log('🛡️ Current location:', location.pathname);
      // Store the intended destination for post-auth redirect
      sessionStorage.setItem('redirectAfterAuth', location.pathname);
      console.log('🛡️ Stored redirect path:', location.pathname);
      // Navigate to auth with booker mode
      navigate('/auth', { replace: true, state: { from: location, mode: 'booker' } });
    }
  }, [status, navigate, location]);

  const isAuthorized = status === 'BOOKER' || status === 'TALENT_COMPLETE' || status === 'ADMIN';

  // While checking the status, show a loading spinner
  if (status === 'LOADING') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render the children (the protected page) if the user is authorized
  return isAuthorized ? <>{children}</> : null;
}