import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
//gemini september 13
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // We wait until the auth state is fully determined by the useAuth hook.
    if (!loading) {
      // If the check is complete and there is NO user,
      // they are not allowed here, so we redirect them to the main auth page.
      if (!user) {
        navigate('/auth');
      }
    }
  }, [user, loading, navigate]);

  // While the useAuth hook is loading, we show a consistent loading spinner.
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If loading is finished AND we have a user, we show the protected page (e.g., the Booker Dashboard).
  // Otherwise, we show nothing while the redirect to /auth is happening.
  return user ? <>{children}</> : null;
}