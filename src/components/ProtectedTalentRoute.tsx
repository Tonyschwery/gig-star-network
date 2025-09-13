import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
//8pm
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
      // A booker trying to access a talent-only page is sent home.
      navigate('/');
    } else if (status === 'TALENT_NEEDS_ONBOARDING' && requireProfile) {
      // A talent who needs to onboard is sent to the form.
      navigate('/talent-onboarding');
    }
  }, [status, requireProfile, navigate]);
  
  // Determine if the user is authorized to see the current page's content
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