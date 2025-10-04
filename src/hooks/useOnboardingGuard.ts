import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Hook to guard routes based on talent onboarding completion status.
 * Redirects to /talent-onboarding if talent user hasn't completed onboarding.
 * This is Supabase-driven and resilient to page refreshes.
 */
export function useOnboardingGuard() {
  const { user, loading, role, onboardingComplete } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    // Only apply to talent users
    if (role === 'talent' && user && !onboardingComplete) {
      console.log('[OnboardingGuard] Talent user with incomplete onboarding, redirecting to /talent-onboarding');
      navigate('/talent-onboarding', { replace: true });
    }
  }, [user, loading, role, onboardingComplete, navigate]);

  return { loading, role, onboardingComplete };
}
