import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
//8pm
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'LOGGED_OUT') {
      navigate('/auth');
    }
  }, [status, navigate]);

  // Show a loader while status is being determined.
  if (status === 'LOADING' || status === 'LOGGED_OUT') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // A booker or a talent can access general protected routes.
  return <>{children}</>;
}