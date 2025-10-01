// FILE: src/components/ProtectedTalentRoute.tsx

import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { forceClearAuth } from '@/lib/auth-utils';

export function ProtectedTalentRoute({ children }: { children: React.ReactNode }) {
    const { status, loading, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            if (loading) {
                return; // Do nothing while auth state is loading
            }

            // Define which statuses are considered a "Talent"
            const isTalent = status === 'TALENT_COMPLETE' || status === 'TALENT_NEEDS_ONBOARDING';
            
            // Also allow users who signed up as talent but haven't completed onboarding yet
            const isTalentSignup = user?.user_metadata?.user_type === 'talent' && status === 'BOOKER';

            if (status === 'LOGGED_OUT') {
                // Clear cache before redirecting to auth
                await forceClearAuth();
                navigate('/auth', { replace: true, state: { from: location, mode: 'talent' } });
            } else if (!isTalent && !isTalentSignup) {
                // If logged in but not as a talent (e.g., a Booker), clear cache and send to homepage
                await forceClearAuth();
                navigate('/');
            }
        };
        
        checkAuth();
    }, [status, loading, navigate, location, user]);

    const isAuthorized = status === 'TALENT_COMPLETE' || status === 'TALENT_NEEDS_ONBOARDING' || 
                        (user?.user_metadata?.user_type === 'talent' && status === 'BOOKER');

    // Show talent content immediately if authorized
    if (isAuthorized) {
        return <>{children}</>;
    }

    // Only show loading during initial check
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return null;
}