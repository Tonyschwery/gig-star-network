// FILE: src/components/ProtectedRoute.tsx

import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && status === 'LOGGED_OUT') {
      // If the check is done and the user is logged out, send them to the auth page
      // and remember where they were trying to go.
      navigate('/auth', { replace: true, state: { from: location, mode: 'booker' } });
    }
  }, [status, loading, navigate, location]);

  // Define who is authorized to see these general protected pages.
  const isAuthorized = status === 'BOOKER' || status === 'TALENT_COMPLETE' || status === 'ADMIN';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authorized, show the page. Otherwise, show nothing while we redirect.
  return isAuthorized ? <>{children}</> : null;
}