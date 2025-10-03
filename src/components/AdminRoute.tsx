// FILE: src/components/AdminRoute.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) {
      console.log('[AdminRoute] Still loading auth');
      return;
    }

    console.log('[AdminRoute] Auth loaded - Status:', status, 'Role:', role);

    if (role !== 'admin') {
      console.log('[AdminRoute] Not an admin, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [status, loading, role, navigate]);

  // Show admin content if authorized
  const isAuthorized = status === 'AUTHENTICATED' && role === 'admin';

  if (isAuthorized && !loading) {
    return <>{children}</>;
  }

  // Show loading during initial check
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return null;
}