import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
//9pm
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'LOGGED_OUT') {
      navigate('/auth');
    }
  }, [status, navigate]);

  const isAuthorized = status === 'BOOKER' || status === 'TALENT_COMPLETE' || status === 'TALENT_NEEDS_ONBOARDING';

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}