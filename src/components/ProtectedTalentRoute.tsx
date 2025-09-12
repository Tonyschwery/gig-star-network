import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedTalentRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}

export function ProtectedTalentRoute({ 
  children, 
  requireProfile = true 
}: ProtectedTalentRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const performCheck = async () => {
      if (authLoading) {
        return; 
      }

      if (!user) {
        navigate('/auth');
        return;
      }

      if (!requireProfile) {
        setIsAuthorized(true);
        setIsChecking(false);
        return;
      }

      const { data: hasProfile, error } = await supabase.rpc('check_talent_profile_exists', {
        user_id_to_check: user.id
      });

      if (error) {
        console.error("Error calling check_talent_profile_exists:", error);
        navigate('/auth');
        return;
      }
      
      if (hasProfile) {
        setIsAuthorized(true);
      } else {
        navigate('/talent-onboarding');
      }
      
      setIsChecking(false);
    };

    performCheck();
  }, [user, authLoading, requireProfile, navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}
