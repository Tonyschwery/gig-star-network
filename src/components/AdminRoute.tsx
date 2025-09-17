// FILE: src/components/AdminRoute.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If the check is done and the user is NOT an admin, redirect them to the homepage.
    if (!loading && status !== 'ADMIN') {
      navigate('/'); 
    }
  }, [status, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render the admin pages if the status is correct.
  return status === 'ADMIN' ? <>{children}</> : null;
}