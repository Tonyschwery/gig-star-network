import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
//gemini 13 4pm
interface ProtectedTalentRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean; // This prop is no longer needed but kept for compatibility
}

export function ProtectedTalentRoute({ children }: ProtectedTalentRouteProps) {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'LOGGED_OUT') {
      navigate('/auth');
    } else if (status === 'BOOKER') {
      // A booker trying to access a talent page should be sent home.
      navigate('/');
    } else if (status === 'TALENT' && !children) {
      // This handles the onboarding case for new talents
      navigate('/talent-onboarding');
    }
  }, [status, navigate, children]);

  if (status === 'LOADING' || status !== 'TALENT') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}