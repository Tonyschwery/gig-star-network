import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
//9pm
interface ProtectedTalentRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export function ProtectedTalentRoute({ children, requireProfile = true }: ProtectedTalentRouteProps) {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'LOGGED_OUT') {
      navigate('/auth');
    } else if (status === 'BOOKER') {
      navigate('/');
    } else if (status === 'TALENT_NEEDS_ONBOARDING' && requireProfile) {
      navigate('/talent-onboarding');
    }
  }, [status, requireProfile, navigate]);
  
  const isAuthorized = status === 'TALENT_COMPLETE' || (status === 'TALENT_NEEDS_ONBOARDING' && !requireProfile);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}