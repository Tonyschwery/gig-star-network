// FILE: src/components/ProtectedTalentRoute.tsx

import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedTalentRoute({ children }: { children: React.ReactNode }) {
    const { status, loading, role, onboardingComplete } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (loading) {
            console.log('[ProtectedTalentRoute] Still loading auth');
            return; // Wait for auth to complete
        }

        console.log('[ProtectedTalentRoute] Auth loaded - Status:', status, 'Role:', role, 'Onboarding:', onboardingComplete);

        // If not logged in, redirect to auth
        if (status === 'LOGGED_OUT') {
            console.log('[ProtectedTalentRoute] Not logged in, redirecting to auth');
            navigate('/auth', { replace: true, state: { from: location, mode: 'talent' } });
            return;
        }

        // If logged in but not a talent, redirect to home
        if (role !== 'talent' && role !== 'admin') {
            console.log('[ProtectedTalentRoute] Not a talent user, redirecting to home');
            navigate('/', { replace: true });
            return;
        }

        // If talent but hasn't completed onboarding and not already on onboarding page
        if (role === 'talent' && !onboardingComplete && location.pathname !== '/talent-onboarding') {
            console.log('[ProtectedTalentRoute] Talent user with incomplete onboarding, redirecting to /talent-onboarding');
            navigate('/talent-onboarding', { replace: true });
            return;
        }

        console.log('[ProtectedTalentRoute] Access granted');
    }, [status, loading, role, onboardingComplete, navigate, location]);

    // Show content if authorized (talent or admin)
    const isAuthorized = status === 'AUTHENTICATED' && (role === 'talent' || role === 'admin');

    if (isAuthorized && !loading) {
        return <>{children}</>;
    }

    // Show loading
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Waiting for redirect
    return null;
}