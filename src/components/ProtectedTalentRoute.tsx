// FILE: src/components/ProtectedTalentRoute.tsx

import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedTalentRoute({ children }: { children: React.ReactNode }) {
    const { status, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (loading) {
            return; // Do nothing while auth state is loading
        }

        // Define which statuses are considered a "Talent"
        const isTalent = status === 'TALENT_COMPLETE' || status === 'TALENT_NEEDS_ONBOARDING';

        if (status === 'LOGGED_OUT') {
            navigate('/auth', { replace: true, state: { from: location, mode: 'talent' } });
        } else if (!isTalent) {
            // If logged in but not as a talent (e.g., a Booker), send to homepage
            navigate('/');
        }
    }, [status, loading, navigate, location]);

    const isAuthorized = status === 'TALENT_COMPLETE' || status === 'TALENT_NEEDS_ONBOARDING';

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return isAuthorized ? <>{children}</> : null;
}