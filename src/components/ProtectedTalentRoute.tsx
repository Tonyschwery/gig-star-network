import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

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
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      // First, wait for the main authentication to finish loading.
      if (authLoading) {
        return;
      }
      
      // If authentication is done and there's no user, redirect to login.
      if (!user) {
        navigate('/auth');
        return;
      }

      // If this route doesn't require a profile (like the onboarding page itself), allow access.
      if (!requireProfile) {
        setLoading(false);
        return;
      }

      try {
        // **THE FIX:** Instead of an RPC, we do a direct, more reliable query.
        // We just check for the existence of a single column, which is very fast.
        const { data, error } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle(); // .maybeSingle() returns data if found, or null if not found.
        
        if (error) {
          // If a real database error occurs, block access.
          console.error('Error checking for talent profile:', error);
          setProfileExists(false);
        } else if (data) {
          // If data is not null, it means we found the profile.
          setProfileExists(true);
        } else {
          // If data is null, no profile was found. User needs to onboard.
          setProfileExists(false);
        }
      } catch (err) {
        console.error('An unexpected error occurred while checking profile:', err);
        setProfileExists(false);
      } finally {
        setLoading(false);
      }
    };

    checkProfile();
  }, [user, authLoading, requireProfile, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {/* Using a more subtle loader */}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // After loading, if a profile is required but doesn't exist, show the prompt.
  if (requireProfile && !profileExists) {
      // Redirecting is cleaner than showing a component that then redirects.
      navigate('/talent-onboarding');
      return null;
  }

  // If all checks pass, show the actual page content.
  return <>{children}</>;
}
