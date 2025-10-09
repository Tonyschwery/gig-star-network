// FILE: src/components/ProtectedTalentRoute.tsx

import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export function ProtectedTalentRoute({ children }: { children: React.ReactNode }) {
    const { status, loading, role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // CRITICAL: Wait for auth to fully load before any redirects
        if (loading) {
            console.log('[ProtectedTalentRoute] Still loading, waiting...');
            return;
        }

        console.log('[ProtectedTalentRoute] Auth loaded:', { 
            status, 
            role, 
            pathname: location.pathname 
        });

        // Not authenticated - redirect to auth
        if (status === 'LOGGED_OUT') {
            console.log('[ProtectedTalentRoute] Not authenticated, redirecting to auth');
            navigate('/auth', { replace: true, state: { from: location, mode: 'talent' } });
            return;
        }

        // Only proceed if authenticated
        if (status !== 'AUTHENTICATED') {
            return;
        }

        // Wrong role - redirect to home
        if (role && role !== 'talent' && role !== 'admin') {
            console.log('[ProtectedTalentRoute] Wrong role, redirecting to home');
            navigate('/', { replace: true });
            return;
        }
    }, [status, loading, role, navigate, location.pathname]);

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