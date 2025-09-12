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
  
  // A clearer state machine to track the process
  const [status, setStatus] = useState<'CHECKING' | 'AUTHORIZED' | 'UNAUTHORIZED'>('CHECKING');

  useEffect(() => {
    // We do nothing until the primary authentication check is complete
    if (authLoading) {
      return;
    }

    // If no user is found after loading, they are unauthorized
    if (!user) {
      setStatus('UNAUTHORIZED');
      return;
    }
    
    // If the page doesn't require a profile, they are authorized
    if (!requireProfile) {
      setStatus('AUTHORIZED');
      return;
    }
    
    // If we have a user and require a profile, we perform the check
    const checkProfile = async () => {
      const { data: hasProfile, error } = await supabase.rpc('check_talent_profile_exists', {
        user_id_to_check: user.id
      });

      if (hasProfile && !error) {
        setStatus('AUTHORIZED');
      } else {
        if (error) console.error("Profile check error:", error);
        setStatus('UNAUTHORIZED');
      }
    };
    checkProfile();

  }, [user, authLoading, requireProfile]);

  // A separate effect to handle navigation avoids loops and race conditions
  useEffect(() => {
    if (status === 'UNAUTHORIZED') {
      // If a user exists but has no profile, send to onboarding.
      // If no user exists at all, send to the main auth page.
      if (user) {
        navigate('/talent-onboarding');
      } else {
        navigate('/auth');
      }
    }
  }, [status, user, navigate]);

  // If we are authorized, show the page content
  if (status === 'AUTHORIZED') {
    return <>{children}</>;
  }

  // Otherwise, show a loading spinner (covers 'CHECKING' state and the brief moment before redirect)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
