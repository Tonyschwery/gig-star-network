// FILE: src/components/ProtectedRoute.tsx

import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) {
      console.log('[ProtectedRoute] Still loading auth');
      return;
    }

    console.log('[ProtectedRoute] Auth loaded - Status:', status);

    if (status === 'LOGGED_OUT') {
      console.log('[ProtectedRoute] Not logged in, redirecting to auth');
      navigate('/auth', { replace: true, state: { from: location, mode: 'booker' } });
    }
  }, [status, loading, navigate, location]);

  const isAuthorized = status === 'AUTHENTICATED';

  // Show content immediately if authorized
  if (isAuthorized && !loading) {
    return <>{children}</>;
  }

  // Show loading screen during auth check
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  return null;
}