import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedTalentRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
}
//gemini 13 september
export function ProtectedTalentRoute({ 
  children, 
  requireProfile = true 
}: ProtectedTalentRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // We don't do anything until the main authentication check from useAuth is complete.
    if (authLoading) {
      return; 
    }

    // If authentication is done and there's no user, redirect them to the auth page.
    if (!user) {
      navigate('/auth');
      return;
    }

    // If this specific route doesn't require a profile (like the onboarding page itself),
    // then the user is authorized to be here.
    if (!requireProfile) {
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }

    // If we have a user and this route requires a profile, we perform the check.
    const checkProfile = async () => {
      // We use the secure database function we created earlier.
      const { data: hasProfile, error } = await supabase.rpc('check_talent_profile_exists', {
        user_id_to_check: user.id
      });

      if (error) {
        console.error("Error checking talent profile:", error);
        // On a critical error, redirect to auth as a safe fallback.
        navigate('/auth'); 
        return;
      }
      
      if (hasProfile) {
        // The user has a profile, so they are authorized to see this page.
        setIsAuthorized(true);
      } else {
        // The user does NOT have a profile, so they are not authorized for this page.
        // We redirect them to the onboarding page to create one.
        navigate('/talent-onboarding');
      }
      
      // The check is complete.
      setIsChecking(false);
    };

    checkProfile();

  }, [user, authLoading, requireProfile, navigate]);

  // While any checks are in progress, show a consistent loading spinner.
  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If the checks are done and the user is authorized, show the page content.
  // Otherwise, render null while the redirect (handled in useEffect) takes place.
  return isAuthorized ? <>{children}</> : null;
}