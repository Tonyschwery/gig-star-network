// FILE: src/pages/AuthCallback.tsx

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Prevent multiple redirects in multi-tab scenarios
    const redirectKey = 'auth_callback_redirecting';
    
    // Check if this is a password recovery callback
    const type = searchParams.get("type");
    
    if (type === "recovery") {
      // For password recovery, redirect to a password update page
      navigate("/auth/update-password", { replace: true });
      return;
    }

    // This function will handle the redirect logic.
    const performRedirect = async (session: Session | null) => {
      // Prevent duplicate redirects across tabs
      if (sessionStorage.getItem(redirectKey)) {
        console.log('[AuthCallback] Redirect already in progress, skipping');
        return;
      }
      sessionStorage.setItem(redirectKey, 'true');

      if (!session?.user) {
        sessionStorage.removeItem(redirectKey);
        navigate("/", { replace: true });
        return;
      }

      const user = session.user;
      
      // Ensure profile is created/updated with correct role
      const userType = user.user_metadata?.user_type || 'booker';
      try {
        await supabase.rpc('ensure_profile', {
          p_user_id: user.id,
          p_email: user.email!,
          p_role: userType
        });
      } catch (error) {
        console.error('Error ensuring profile:', error);
      }
      let state: any = {};
      try {
        const stateParam = searchParams.get("state");
        if (stateParam) {
          state = JSON.parse(stateParam);
        }
      } catch (e) {
        console.error("Could not parse auth redirect state:", e);
      }

      const intent = state?.intent;
      const talentId = state?.talentId;
      const from = state?.from?.pathname || null;

      // Check for stored booking intent in localStorage
      const storedIntent = localStorage.getItem('bookingIntent');
      let bookingData = null;
      if (storedIntent) {
        try {
          bookingData = JSON.parse(storedIntent);
          localStorage.removeItem('bookingIntent'); // Clean up immediately
        } catch (e) {
          console.error('Error parsing booking intent:', e);
        }
      }

      if (user.email === "admin@qtalent.live") {
        navigate("/admin", { replace: true });
      } else if (bookingData?.talentId) {
        // Redirect to talent profile with booking form open
        toast({
          title: "Welcome! 🎉",
          description: `You can now book ${bookingData.talentName || 'your talent'}.`,
          duration: 4000,
        });
        navigate(`/talent/${bookingData.talentId}`, { state: { openBookingForm: true }, replace: true });
      } else if (intent === "event-form") {
        navigate("/your-event", { replace: true });
      } else if (intent === "booking-form" && talentId) {
        navigate(`/talent/${talentId}`, { state: { openBookingForm: true }, replace: true });
      } else if (from && from !== "/auth" && from !== "/") {
        navigate(from, { replace: true });
      } else {
        const userType = user.user_metadata?.user_type;
        if (userType === "talent") {
          navigate("/talent-dashboard", { replace: true });
        } else {
          navigate("/booker-dashboard", { replace: true });
        }
      }
      
      // Clear redirect lock after navigation
      setTimeout(() => sessionStorage.removeItem(redirectKey), 1000);
    };

    // Check session immediately first for faster redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        performRedirect(session);
        return;
      }
    });

    // Also listen for auth state changes as fallback
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        performRedirect(session);
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
      sessionStorage.removeItem(redirectKey);
    };
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Finalizing login, please wait...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
