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
      if (authLoading) return;
      
      if (!user) {
        navigate('/auth');
        return;
      }

      if (!requireProfile) {
        setLoading(false);
        return;
      }

      try {
        // Use secure function to check if user has talent profile
        const { data: hasProfile, error } = await supabase.rpc('user_has_talent_profile');
        
        if (error) {
          console.error('Error checking profile:', error);
          setProfileExists(false);
        } else {
          setProfileExists(hasProfile);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  if (requireProfile && profileExists === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Profile Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You need to complete your talent profile to access this page.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/talent-onboarding')} 
                className="w-full hero-button"
              >
                Complete Profile
              </Button>
              <Button 
                onClick={() => navigate('/auth')} 
                variant="outline" 
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}