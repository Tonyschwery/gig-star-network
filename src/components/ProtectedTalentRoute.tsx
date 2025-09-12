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
  const [status, setStatus] = useState<'CHECKING' | 'AUTHORIZED' | 'UNAUTHORIZED'>('CHECKING');

  useEffect(() => {
    // We do nothing until the primary authentication check is complete.
    if (authLoading) {
      return;
    }

    // If no user is found after loading, they are unauthorized.
    if (!user) {
      setStatus('UNAUTHORIZED');
      return;
    }
    
    // If the page doesn't require a profile, they are authorized.
    if (!requireProfile) {
      setStatus('AUTHORIZED');
      return;
    }
    
    // If we have a user and require a profile, we perform the check.
    const checkProfile = async () => {
      // This is the simpler, more reliable direct query.
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('id') // We only need to check if a row exists.
        .eq('user_id', user.id)
        .maybeSingle(); // Returns the row or null, doesn't error if not found.

      if (data && !error) {
        // If we found data, the profile exists.
        setStatus('AUTHORIZED');
      } else {
        // If data is null or an error occurred, the profile does not exist for this user.
        if (error) console.error("Error checking profile:", error);
        setStatus('UNAUTHORIZED');
      }
    };
    checkProfile();

  }, [user, authLoading, requireProfile]);

  // A separate effect to handle navigation based on the final status.
  useEffect(() => {
    if (status === 'UNAUTHORIZED') {
      if (user) {
        navigate('/talent-onboarding');
      } else {
        navigate('/auth');
      }
    }
  }, [status, user, navigate]);

  // If we are authorized, show the page content.
  if (status === 'AUTHORIZED') {
    return <>{children}</>;
  }

  // Otherwise, show a loading spinner.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
