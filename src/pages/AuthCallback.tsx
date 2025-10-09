// FILE: src/pages/AuthCallback.tsx

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // This function will handle the redirect logic.
    const performRedirect = async (session: Session | null) => {
      if (!session?.user) {
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

      if (user.email === "admin@qtalent.live") {
        navigate("/admin", { replace: true });
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
    };

    // We listen for the SIGNED_IN event.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        performRedirect(session);
        // Clean up the listener once we've handled the sign-in.
        authListener?.subscription.unsubscribe();
      }
    });

    // Also check if the session is already available, in case the event fired before the listener was set up.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        performRedirect(session);
        authListener?.subscription.unsubscribe();
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

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
