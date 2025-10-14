// FILE: src/pages/AuthCallback.tsx

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const type = searchParams.get("type");

    // ✅ Handle password recovery links safely
    if (type === "recovery") {
      navigate("/auth/update-password", { replace: true });
      return;
    }
    // ✅ Handle normal auth redirect flow
    const performRedirect = async (session: Session | null) => {
      if (sessionStorage.getItem(redirectKey)) {
        console.log("[AuthCallback] Redirect already in progress, skipping");
        return;
      }
      sessionStorage.setItem(redirectKey, "true");

      if (!session?.user) {
        sessionStorage.removeItem(redirectKey);
        navigate("/", { replace: true });
        return;
      }

      const user = session.user;
      const userType = user.user_metadata?.user_type || "booker";

      try {
        await supabase.rpc("ensure_profile", {
          p_user_id: user.id,
          p_email: user.email!,
          p_role: userType,
        });
      } catch (error) {
        console.error("Error ensuring profile:", error);
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

      const storedIntent = localStorage.getItem("bookingIntent");
      let bookingData = null;
      if (storedIntent) {
        try {
          bookingData = JSON.parse(storedIntent);
          localStorage.removeItem("bookingIntent");
        } catch (e) {
          console.error("Error parsing booking intent:", e);
        }
      }

      if (user.email === "admin@qtalent.live") {
        navigate("/admin", { replace: true });
      } else if (bookingData?.talentId) {
        toast({
          title: "Welcome! 🎉",
          description: `You can now book ${bookingData.talentName || "your talent"}.`,
          duration: 4000,
        });
        navigate(`/talent/${bookingData.talentId}`, {
          state: { openBookingForm: true },
          replace: true,
        });
      } else if (intent === "event-form") {
        navigate("/your-event", { replace: true });
      } else if (intent === "booking-form" && talentId) {
        navigate(`/talent/${talentId}`, {
          state: { openBookingForm: true },
          replace: true,
        });
      } else if (from && from !== "/auth" && from !== "/") {
        navigate(from, { replace: true });
      } else {
        const role = user.user_metadata?.user_type;
        navigate(role === "talent" ? "/talent-dashboard" : "/booker-dashboard", {
          replace: true,
        });
      }

      setTimeout(() => sessionStorage.removeItem(redirectKey), 1000);
    };

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) performRedirect(session);
    });

    // Listen for auth state change
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) performRedirect(session);
    });

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
