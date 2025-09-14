import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get the current location the user is trying to access

  useEffect(() => {
    if (status === 'LOGGED_OUT') {
      // **THE FIX:** When redirecting, we now pass state.
      // 'from': tells the login page where to return the user after success.
      // 'mode': tells the login page to show text for a 'booker'.
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