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
    console.log('%c[DEBUG] Step 1: The ProtectedTalentRoute component is running its check.', 'color: cyan; font-weight: bold;');

    const check = async () => {
      console.log(`%c[DEBUG] Step 2: The 'authLoading' status from useAuth() is: ${authLoading}`, 'color: cyan;');
      if (authLoading) {
        console.log('%c[DEBUG] Still waiting for authentication to load. Aborting this check.', 'color: orange;');
        return;
      }

      console.log(`%c[DEBUG] Step 3: Authentication is loaded. Checking for a user object.`, 'color: cyan;');
      if (!user) {
        console.log('%c[DEBUG] Result: No user found. Setting status to UNAUTHORIZED.', 'color: red;');
        setStatus('UNAUTHORIZED');
        return;
      }

      console.log(`%c[DEBUG] Result: User found with ID: ${user.id}`, 'color: green;');
      console.log(`%c[DEBUG] Step 4: Does this route require a profile? ${requireProfile}`, 'color: cyan;');
      if (!requireProfile) {
        console.log('%c[DEBUG] Result: No profile required. Setting status to AUTHORIZED.', 'color: green;');
        setStatus('AUTHORIZED');
        return;
      }
      
      console.log(`%c[DEBUG] Step 5: Calling the 'check_talent_profile_exists' database function for user ${user.id}...`, 'color: cyan;');
      const { data: hasProfile, error } = await supabase.rpc('check_talent_profile_exists', {
        user_id_to_check: user.id
      });

      console.log(`%c[DEBUG] Step 6: Database function returned.`, 'color: cyan;');
      console.log(`%c[DEBUG]   - Result for hasProfile: ${hasProfile}`, 'color: cyan;');
      console.log(`%c[DEBUG]   - Error object: ${JSON.stringify(error, null, 2)}`, 'color: cyan;');

      if (hasProfile && !error) {
        console.log('%c[DEBUG] Result: Profile exists. Setting status to AUTHORIZED.', 'color: green;');
        setStatus('AUTHORIZED');
      } else {
        console.log('%c[DEBUG] Result: Profile does NOT exist or an error occurred. Setting status to UNAUTHORIZED.', 'color: red;');
        setStatus('UNAUTHORIZED');
      }
    };
    check();

  }, [user, authLoading, requireProfile]);

  useEffect(() => {
    console.log(`%c[DEBUG] Navigation check: Current status is '${status}'`, 'color: magenta;');
    if (status === 'UNAUTHORIZED') {
      if (user) {
        console.log('%c[DEBUG] Redirecting to /talent-onboarding...', 'color: magenta;');
        navigate('/talent-onboarding');
      } else {
        console.log('%c[DEBUG] Redirecting to /auth...', 'color: magenta;');
        navigate('/auth');
      }
    }
  }, [status, user, navigate]);

  if (status === 'AUTHORIZED') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
