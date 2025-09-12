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
  
  // We use a single state to track the status: loading, authorized, or unauthorized.
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    // 1. We don't do anything until the main authentication check is complete.
    if (authLoading) {
      return;
    }

    // 2. If authentication is finished and there's no user, they are unauthorized.
    if (!user) {
      setStatus('unauthorized');
      return;
    }

    // 3. If the route doesn't require a profile (like the onboarding page), they are authorized.
    if (!requireProfile) {
      setStatus('authorized');
      return;
    }

    // 4. If we get here, we have a user and need to check for a profile.
    const checkProfile = async () => {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && !error) {
        // Profile exists, they are fully authorized.
        setStatus('authorized');
      } else {
        // No profile found or an error occurred, they are unauthorized for this page.
        setStatus('unauthorized');
      }
    };

    checkProfile();

  }, [user, authLoading, requireProfile, navigate]);


  // Handle redirection based on the final status.
  useEffect(() => {
    if (status === 'unauthorized') {
      // If a user exists but has no profile, send to onboarding.
      // If no user exists, send to the main auth page.
      if (user) {
        navigate('/talent-onboarding');
      } else {
        navigate('/auth');
      }
    }
  }, [status, user, navigate]);


  // Show the loading spinner only while the status is 'loading'.
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authorized, show the page. Otherwise, show nothing while redirecting.
  return status === 'authorized' ? <>{children}</> : null;
}
