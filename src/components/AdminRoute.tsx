// FILE: src/components/AdminRoute.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth'; // We now use the main auth hook

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { status, loading } = useAuth(); // Get status from the unified hook
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && status !== 'ADMIN') {
      // If the check is done and the user is NOT an admin, redirect them
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

  // Only render the admin pages if the status is correct
  return status === 'ADMIN' ? <>{children}</> : null;
}