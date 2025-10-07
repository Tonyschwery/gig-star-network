// FILE: src/pages/AuthCallback.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for the auth session to be confirmed
    if (loading) {
      return;
    }

    // The original state (intent, from, etc.) is passed in the URL hash
    let state = {};
    try {
      if (window.location.hash.length > 1) {
        state = JSON.parse(decodeURIComponent(window.location.hash.substring(1)));
      }
    } catch (e) {
      console.error("Could not parse auth redirect state:", e);
    }

    if (user) {
      // THIS IS YOUR ORIGINAL, UNCHANGED REDIRECT LOGIC
      const intent = state?.intent;
      const talentId = state?.talentId;
      const from = state?.from?.pathname || null;

      if (user.email === 'admin@qtalent.live') {
        navigate('/admin', { replace: true });
      } else if (intent === 'event-form') {
        navigate('/your-event', { replace: true });
      } else if (intent === 'booking-form' && talentId) {
        navigate(`/talent/${talentId}`, { state: { openBookingForm: true }, replace: true });
      } else if (from && from !== '/auth' && from !== '/') {
        navigate(from, { replace: true });
      } else {
        const userType = user.user_metadata?.user_type;
        if (userType === 'talent') {
          navigate('/talent-dashboard', { replace: true });
        } else {
          navigate('/booker-dashboard', { replace: true });
        }
      }
    } else {
      // If for some reason auth fails, send them back to the home page.
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Authenticating, please wait...</p>
      </div>
    </div>
  );
};

export default AuthCallback;