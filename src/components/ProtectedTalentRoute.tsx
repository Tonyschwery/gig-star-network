// FILE: src/components/ProtectedTalentRoute.tsx

import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedTalentRoute({ children }: { children: React.ReactNode }) {
    const { status, loading, role, onboardingComplete } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // CRITICAL: Wait for auth to fully load before any redirects
        if (loading) {
            return;
        }

        // Not authenticated - redirect to auth
        if (status === 'LOGGED_OUT') {
            navigate('/auth', { replace: true, state: { from: location, mode: 'talent' } });
            return;
        }

        // Wrong role - redirect to home
        if (status === 'AUTHENTICATED' && role && role !== 'talent' && role !== 'admin') {
            navigate('/', { replace: true });
            return;
        }

        // CRITICAL FIX: Only check onboarding for talent users when not already on the onboarding page
        // This prevents redirect loops after completing onboarding
        if (status === 'AUTHENTICATED' && role === 'talent' && location.pathname !== '/talent-onboarding') {
            // If onboarding is NOT complete, redirect to onboarding
            if (!onboardingComplete) {
                navigate('/talent-onboarding', { replace: true });
            }
        }
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