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
      navigate('/auth', { replace: true, state: { from: location, mode: 'booker' } });
    }
  }, [status, loading, navigate, location]);

  const isAuthorized = status === 'BOOKER' || status === 'TALENT_COMPLETE' || status === 'ADMIN';

  // Show content immediately if authorized, avoid loading screen flicker
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Only show loading screen during initial auth check
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